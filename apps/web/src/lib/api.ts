import axios from 'axios';
import { MOCK_LEADS_RAW } from './mockData';
import type { Lead } from './mockData';

// Determine if we should run in browser-based database simulator mode
const isVercel = window.location.hostname !== 'localhost';

// Helper to initialize mock DB in localStorage
function initMockDb() {
  if (!localStorage.getItem('bb_leads')) {
    const leads: Lead[] = MOCK_LEADS_RAW.map((item) => {
      const winProb =
        item.stage === 'WON' ? 100 :
        item.stage === 'NEGOTIATION' ? 85 :
        item.stage === 'PROPOSAL' ? 70 :
        item.stage === 'MEETING' ? 50 :
        item.stage === 'CONTACTED' ? 30 : 15;

      const projectType =
        item.area.includes('4000') ? 'Luxury Villa Architecture' :
        item.area.includes('2000') ? '3 BHK Premium Interior' :
        item.area.includes('1000') ? '2 BHK Compact Interior' : 'Apartment Interior Design';

      const source = item.valid === 'In Service Area' ? 'Referral' : 'Google';

      return {
        id: item.id,
        name: item.name,
        projectType: projectType,
        projectDescription: `Built-up area: ${item.area}. Service region: ${item.valid}. Location: ${item.location}.`,
        location: item.location,
        budgetLakhs: item.budgetLakhs,
        source: source,
        priority: item.priority as any,
        stage: item.stage as any,
        phone: item.phone,
        email: item.email,
        winProbability: winProb,
        tags: JSON.stringify([item.valid === 'In Service Area' ? 'In Service Area' : 'Out of Service', item.area, `ID: ${item.id}`]),
        createdAt: new Date(Date.now() - Math.random() * 10 * 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        activities: [
          {
            id: `act-${Math.random().toString(36).slice(2, 9)}`,
            leadId: item.id,
            type: 'NOTE',
            text: `Lead ${item.id} captured. Service zone: ${item.valid}. Contact: ${item.phone}.`,
            createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
            createdById: 'admin-id',
            createdBy: { name: 'AR.PARTHIBAN MOORTHY' }
          }
        ]
      };
    });
    localStorage.setItem('bb_leads', JSON.stringify(leads));
  }
}

if (isVercel) {
  initMockDb();
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Mock Interceptor for Vercel demo support
if (isVercel) {
  api.interceptors.request.use(async (config) => {
    config.adapter = async (cfg) => {
      const url = cfg.url || '';
      const method = (cfg.method || 'get').toLowerCase();
      const data = cfg.data ? JSON.parse(cfg.data) : null;

      // Simulate a network latency
      await new Promise(resolve => setTimeout(resolve, 80));

      const leads: Lead[] = JSON.parse(localStorage.getItem('bb_leads') || '[]');

      // 1. POST /auth/login
      if (url.includes('/auth/login') && method === 'post') {
        const { email, password } = data;
        if (email === 'arparthibanmoorthy@gmail.com' && password === 'password123') {
          localStorage.setItem('accessToken', 'mock-access-token');
          localStorage.setItem('refreshToken', 'mock-refresh-token');
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            config: cfg,
            data: {
              status: 'success',
              data: {
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                user: {
                  id: 'admin-id',
                  email: 'arparthibanmoorthy@gmail.com',
                  name: 'AR.PARTHIBAN MOORTHY',
                  role: 'PRINCIPAL',
                  initials: 'PM'
                }
              }
            }
          };
        }
        return Promise.reject({
          response: {
            status: 401,
            data: { message: 'Invalid credentials. Please try again.' }
          }
        });
      }

      // 2. GET /auth/me
      if (url.includes('/auth/me') && method === 'get') {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          data: {
            status: 'success',
            data: {
              id: 'admin-id',
              email: 'arparthibanmoorthy@gmail.com',
              name: 'AR.PARTHIBAN MOORTHY',
              role: 'PRINCIPAL',
              initials: 'PM'
            }
          }
        };
      }

      // 3. POST /auth/logout
      if (url.includes('/auth/logout') && method === 'post') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          data: { status: 'success' }
        };
      }

      // 4. GET /auth/team
      if (url.includes('/auth/team') && method === 'get') {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          data: {
            status: 'success',
            data: [
              { id: 'admin-id', name: 'AR.PARTHIBAN MOORTHY', email: 'arparthibanmoorthy@gmail.com', role: 'PRINCIPAL', initials: 'PM' },
              { id: 'sales-priya', name: 'Priya', email: 'priya@gmail.com', role: 'SALES', initials: 'P' },
              { id: 'sales-rahul', name: 'Rahul', email: 'rahul@gmail.com', role: 'SALES', initials: 'R' }
            ]
          }
        };
      }

      // 5. GET /analytics/overview
      if (url.includes('/analytics/overview') && method === 'get') {
        const total = leads.length;
        const won = leads.filter((l) => l.stage === 'WON').length;
        const lost = leads.filter((l) => l.stage === 'LOST').length;
        const active = leads.filter((l) => !['WON', 'LOST'].includes(l.stage)).length;
        const pipelineValue = leads.filter((l) => !['WON', 'LOST'].includes(l.stage)).reduce((acc, l) => acc + l.budgetLakhs, 0);
        const weightedForecast = leads
          .filter((l) => !['WON', 'LOST'].includes(l.stage))
          .reduce((acc, l) => acc + l.budgetLakhs * (l.winProbability / 100), 0);

        const STAGES = ['NEW', 'CONTACTED', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
        const funnelData = STAGES.map((stage) => {
          const matched = leads.filter(l => l.stage === stage);
          const count = matched.length;
          const valueLakhs = matched.reduce((a, b) => a + b.budgetLakhs, 0);
          return { stage, count, valueLakhs };
        });

        // Group by source
        const sourceMap: Record<string, number> = {};
        leads.forEach(l => {
          sourceMap[l.source] = (sourceMap[l.source] || 0) + 1;
        });
        const bySource = Object.keys(sourceMap).map(source => ({ source, count: sourceMap[source] })).sort((a,b) => b.count - a.count);

        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          data: {
            success: true,
            data: {
              totalLeads: total,
              activeLeads: active,
              wonLeads: won,
              lostLeads: lost,
              conversionRate: total > 0 ? Math.round((won / total) * 100) : 0,
              pipelineValueLakhs: pipelineValue,
              weightedForecastLakhs: weightedForecast,
              winLoss: { won, lost, stalled: total - won - lost },
              funnel: funnelData,
              bySource,
              todaysMeetings: 1
            }
          }
        };
      }

      // 6. GET /analytics/source-breakdown
      if (url.includes('/analytics/source-breakdown') && method === 'get') {
        const sourceMap: Record<string, number> = {};
        leads.forEach(l => {
          sourceMap[l.source] = (sourceMap[l.source] || 0) + 1;
        });
        const data = Object.keys(sourceMap).map(source => ({ source, count: sourceMap[source] }));
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          data: { success: true, data }
        };
      }

      // 7. GET /analytics/team-leaderboard
      if (url.includes('/analytics/team-leaderboard') && method === 'get') {
        const total = leads.length;
        const won = leads.filter((l) => l.stage === 'WON').length;
        const active = leads.filter((l) => !['WON', 'LOST'].includes(l.stage)).length;
        const pipeline = leads.filter((l) => !['WON', 'LOST'].includes(l.stage)).reduce((a, l) => a + l.budgetLakhs, 0);
        const weighted = leads.filter((l) => !['WON', 'LOST'].includes(l.stage)).reduce((a, l) => a + l.budgetLakhs * (l.winProbability / 100), 0);

        const leader = {
          id: 'admin-id',
          name: 'AR.PARTHIBAN MOORTHY',
          initials: 'PM',
          role: 'PRINCIPAL',
          totalLeads: total,
          activeLeads: active,
          wonLeads: won,
          pipelineLakhs: pipeline,
          weightedLakhs: weighted,
          conversionRate: total > 0 ? Math.round((won / total) * 100) : 0
        };

        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          data: { success: true, data: [leader] }
        };
      }

      // 8. GET /analytics/monthly-trends
      if (url.includes('/analytics/monthly-trends') && method === 'get') {
        const months = [
          { month: 'Mar 26', newLeads: 12, wonLeads: 2, wonValueLakhs: 70 },
          { month: 'Apr 26', newLeads: 18, wonLeads: 3, wonValueLakhs: 110 },
          { month: 'May 26', newLeads: 22, wonLeads: 5, wonValueLakhs: 210 },
          { month: 'Jun 26', newLeads: 29, wonLeads: 6, wonValueLakhs: 260 },
          { month: 'Jul 26', newLeads: 16, wonLeads: 4, wonValueLakhs: 180 },
          { month: 'Aug 26', newLeads: leads.length, wonLeads: leads.filter(l => l.stage === 'WON').length, wonValueLakhs: leads.filter(l => l.stage === 'WON').reduce((a,b) => a + b.budgetLakhs, 0) }
        ];
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          data: { success: true, data: months }
        };
      }

      // 9. GET /meetings
      if (url.includes('/meetings') && method === 'get') {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          data: {
            success: true,
            data: [
              {
                id: 'meet-1',
                leadId: 'CRM-005',
                lead: { name: 'Magizh', projectType: '3 BHK Premium Interior' },
                scheduledAt: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
                title: 'Design Consultation Meeting',
                description: 'Discuss premium floor plan and kitchen layout.',
                completed: false
              }
            ]
          }
        };
      }

      // 10. GET /notifications
      if (url.includes('/notifications') && !url.includes('/read') && method === 'get') {
        const notifications = JSON.parse(localStorage.getItem('bb_notifications') || '[]');
        if (notifications.length === 0) {
          const initNotifications = [
            {
              id: 'notif-1',
              title: 'Hot Lead Assigned',
              message: 'Lead Govindasamyraja (CRM-002) is waiting for follow-up.',
              read: false,
              createdAt: new Date().toISOString()
            }
          ];
          localStorage.setItem('bb_notifications', JSON.stringify(initNotifications));
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            config: cfg,
            data: { success: true, data: initNotifications }
          };
        }
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          data: { success: true, data: notifications }
        };
      }

      // 11. PATCH /notifications/read-all or /notifications/:id/read
      if (url.includes('/notifications') && url.includes('/read')) {
        const notifications = JSON.parse(localStorage.getItem('bb_notifications') || '[]');
        const updated = notifications.map((n: any) => ({ ...n, read: true }));
        localStorage.setItem('bb_notifications', JSON.stringify(updated));
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          data: { success: true }
        };
      }

      // GET /search
      if (url.includes('/search') && method === 'get') {
        const urlObj = new URL(url, 'http://dummy.com');
        const q = (urlObj.searchParams.get('q') || '').toLowerCase();
        
        let filtered: Lead[] = [];
        if (q && q.length >= 2) {
          filtered = leads.filter(l => 
            l.name.toLowerCase().includes(q) ||
            l.location.toLowerCase().includes(q) ||
            l.projectType.toLowerCase().includes(q) ||
            (l.email && l.email.toLowerCase().includes(q)) ||
            (l.phone && l.phone.includes(q)) ||
            l.id.toLowerCase().includes(q)
          );
        }
        
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          data: {
            success: true,
            data: { leads: filtered.slice(0, 10) }
          }
        };
      }

      // 12. GET /leads
      if (url.includes('/leads') && !url.includes('/leads/') && method === 'get') {
        let filtered = [...leads];
        const urlObj = new URL(url, 'http://dummy.com');
        const stage = urlObj.searchParams.get('stage');
        const priority = urlObj.searchParams.get('priority');

        if (stage) filtered = filtered.filter(l => l.stage === stage);
        if (priority) filtered = filtered.filter(l => l.priority === priority);

        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          data: {
            status: 'success',
            data: filtered
          }
        };
      }

      // 13. GET /leads/:id
      const leadIdMatch = url.match(/\/leads\/(CRM-\d+)/);
      if (leadIdMatch && !url.includes('/activities') && method === 'get') {
        const id = leadIdMatch[1];
        const lead = leads.find(l => l.id === id);
        if (lead) {
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            config: cfg,
            data: {
              status: 'success',
              data: lead
            }
          };
        }
        return Promise.reject({ response: { status: 404, data: { message: 'Lead not found' } } });
      }

      // 14. PATCH /leads/:id
      if (leadIdMatch && method === 'patch') {
        const id = leadIdMatch[1];
        const idx = leads.findIndex(l => l.id === id);
        if (idx !== -1) {
          const original = leads[idx];
          const updated = { ...original, ...data, updatedAt: new Date().toISOString() };

          if (data.stage && data.stage !== original.stage) {
            const act = {
              id: `act-${Math.random().toString(36).slice(2, 9)}`,
              leadId: id,
              type: 'STAGE_CHANGE',
              text: `Stage changed from ${original.stage} to ${data.stage}.`,
              createdAt: new Date().toISOString(),
              createdById: 'admin-id',
              createdBy: { name: 'AR.PARTHIBAN MOORTHY' }
            };
            updated.activities = [...(original.activities || []), act];
          }

          leads[idx] = updated;
          localStorage.setItem('bb_leads', JSON.stringify(leads));

          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            config: cfg,
            data: {
              status: 'success',
              data: updated
            }
          };
        }
        return Promise.reject({ response: { status: 404, data: { message: 'Lead not found' } } });
      }

      // 15. POST /leads/:id/activities
      if (leadIdMatch && url.includes('/activities') && method === 'post') {
        const id = leadIdMatch[1];
        const idx = leads.findIndex(l => l.id === id);
        if (idx !== -1) {
          const original = leads[idx];
          const newAct = {
            id: `act-${Math.random().toString(36).slice(2, 9)}`,
            leadId: id,
            type: data.type || 'NOTE',
            text: data.text,
            quote: data.quote,
            createdAt: new Date().toISOString(),
            createdById: 'admin-id',
            createdBy: { name: 'AR.PARTHIBAN MOORTHY' }
          };
          original.activities = [...(original.activities || []), newAct];
          leads[idx] = original;
          localStorage.setItem('bb_leads', JSON.stringify(leads));

          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            config: cfg,
            data: {
              status: 'success',
              data: newAct
            }
          };
        }
        return Promise.reject({ response: { status: 404, data: { message: 'Lead not found' } } });
      }

      // 16. POST /leads
      if (url.includes('/leads') && method === 'post') {
        const nextNum = leads.length + 1;
        const newId = `CRM-${String(nextNum).padStart(3, '0')}`;
        const newLead: Lead = {
          id: newId,
          name: data.name,
          projectType: data.projectType || 'Apartment Interior Design',
          projectDescription: data.projectDescription || '',
          location: data.location || 'Chennai',
          budgetLakhs: data.budgetLakhs || 20,
          source: data.source || 'Referral',
          priority: data.priority || 'WARM',
          stage: 'NEW',
          phone: data.phone,
          email: data.email,
          winProbability: 15,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          activities: [
            {
              id: `act-${Math.random().toString(36).slice(2, 9)}`,
              leadId: newId,
              type: 'NOTE',
              text: `Lead ${newId} created manually.`,
              createdAt: new Date().toISOString(),
              createdById: 'admin-id',
              createdBy: { name: 'AR.PARTHIBAN MOORTHY' }
            }
          ]
        };
        leads.push(newLead);
        localStorage.setItem('bb_leads', JSON.stringify(leads));
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          data: {
            status: 'success',
            data: newLead
          }
        };
      }

      return Promise.reject({ response: { status: 404, data: { message: 'Not found mock API' } } });
    };

    return config;
  });
}

// Handle 401s with token refresh
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && !isVercel) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'}/auth/refresh`,
          { refreshToken },
        );
        localStorage.setItem('accessToken', data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export default api;
