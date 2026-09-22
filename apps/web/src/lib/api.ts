import axios from 'axios';
import { MOCK_LEADS_RAW } from './mockData';
import type { Lead } from './mockData';

// Determine if we should run in browser-based database simulator mode
const isDemoMode = import.meta.env.VITE_USE_MOCK === 'true' ||
  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') && !import.meta.env.VITE_API_URL);

function getInitialStage(serialNo: number): "NEW" | "CONTACTED" | "CALL_BACK" | "MEETING" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" {
  if ([2, 14, 28, 42].includes(serialNo)) return "WON";
  if ([7, 18, 33, 49, 63].includes(serialNo)) return "NEGOTIATION";
  if ([1, 11, 20, 25, 36, 48, 58, 67].includes(serialNo)) return "PROPOSAL";
  if ([4, 15, 22, 31, 41, 52, 62].includes(serialNo)) return "MEETING";
  if ([5, 10, 19, 29, 39, 47, 56, 65].includes(serialNo)) return "CALL_BACK";
  if ([3, 8, 12, 17, 24, 30, 35, 43, 50, 57, 64, 69].includes(serialNo)) return "CONTACTED";
  if ([6, 21, 38].includes(serialNo)) return "LOST";
  return "NEW";
}

// Helper to initialize mock DB in localStorage with all 69 DND leads
function initMockDb() {
  if (!localStorage.getItem('dnd_leads_v8')) {
    const SOURCES = [
      'Google Maps',
      'Instagram Showcase',
      'Architect Referral',
      'Website Portfolio',
      'Field Survey',
    ];
    const defaultLeads: Lead[] = MOCK_LEADS_RAW.map((r, i) => {
      const serialNo = i + 1;
      const source = (r as any).source || (
        serialNo % 5 === 0 ? 'Instagram Showcase' :
        serialNo % 7 === 0 ? 'Architect Referral' :
        serialNo % 9 === 0 ? 'Website Portfolio' :
        serialNo % 13 === 0 ? 'Field Survey' :
        'Google Maps'
      );
      return {
        id: `DND-${String(serialNo).padStart(3, '0')}`,
        serialNo,
        name: r.name,
        projectType: r.projectType || 'Architecture & Turnkey Interior',
        projectDescription: `Google Maps: ${r.category || 'Architecture & Construction'}, Rating: ${r.rating || 5}`,
        location: `${r.city || 'Chennai'}, ${r.state || 'Tamil Nadu'}`,
        budgetLakhs: r.budgetLakhs || 45,
        source: source,
        priority: (r.priority as any) || 'HOT',
        stage: (r as any).stage || getInitialStage(serialNo),
        phone: r.phone || '9360931010',
        email: `contact@${r.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        winProbability: 75,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activities: [],
      };
    });
    localStorage.setItem('bb_leads', JSON.stringify(defaultLeads));
    localStorage.setItem('dnd_cached_leads_v5', JSON.stringify(defaultLeads));
    localStorage.setItem('dnd_leads_v8', 'true');
  }
}

if (isDemoMode) {
  initMockDb();
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? (
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:4000/api'
      : '/api'
  ),
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Mock Interceptor for demo support
if (isDemoMode) {
  api.interceptors.request.use(async (config) => {
    config.adapter = async (cfg) => {
      const url = cfg.url || '';
      const method = (cfg.method || 'get').toLowerCase();
      const data = cfg.data ? JSON.parse(cfg.data) : null;

      const leads: Lead[] = JSON.parse(localStorage.getItem('bb_leads') || '[]');

      // Helper function to find lead by ID, serial number or DND-XXX string
      const findLeadByAnyId = (param: string) => {
        const decoded = decodeURIComponent(param);
        const numPart = decoded.replace(/\D/g, '');
        return leads.find(l => 
          l.id === decoded ||
          l.id.toLowerCase() === decoded.toLowerCase() ||
          String((l as any).serialNo) === decoded ||
          (numPart && String((l as any).serialNo) === String(parseInt(numPart, 10))) ||
          ((l as any).serialNo && `dnd-${String((l as any).serialNo).padStart(3, '0')}`.toLowerCase() === decoded.toLowerCase())
        );
      };

      const findLeadIndexByAnyId = (param: string) => {
        const decoded = decodeURIComponent(param);
        const numPart = decoded.replace(/\D/g, '');
        return leads.findIndex(l => 
          l.id === decoded ||
          l.id.toLowerCase() === decoded.toLowerCase() ||
          String((l as any).serialNo) === decoded ||
          (numPart && String((l as any).serialNo) === String(parseInt(numPart, 10))) ||
          ((l as any).serialNo && `dnd-${String((l as any).serialNo).padStart(3, '0')}`.toLowerCase() === decoded.toLowerCase())
        );
      };

      // 1. POST /auth/login
      if (url.includes('/auth/login') && method === 'post') {
        const { email, password } = data;
        if (email === 'nirmalkumar00727@gmail.com' && password === 'password123') {
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
                  email: 'nirmalkumar00727@gmail.com',
                  name: 'Nirmal kumar N',
                  role: 'ADMIN',
                  initials: 'N'
                }
              }
            }
          };
        }
        if (email === 'gayathrideva2007@gmail.com' && password === 'password123') {
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
                  id: 'principal-gd',
                  email: 'gayathrideva2007@gmail.com',
                  name: 'Gayathri',
                  role: 'PRINCIPAL',
                  initials: 'G'
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
              email: 'nirmalkumar00727@gmail.com',
              name: 'Nirmal kumar N',
              role: 'ADMIN',
              initials: 'N'
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
              { id: 'admin-id', name: 'Nirmal kumar N', email: 'nirmalkumar00727@gmail.com', role: 'ADMIN', initials: 'N' },
              { id: 'principal-gd', name: 'Gayathri', email: 'gayathrideva2007@gmail.com', role: 'PRINCIPAL', initials: 'G' },
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

        const team = [
          {
            id: 'admin-id',
            name: 'Nirmal kumar N',
            initials: 'NK',
            role: 'PRINCIPAL',
            totalLeads: Math.round(total * 0.42),
            activeLeads: Math.round(active * 0.42),
            wonLeads: Math.max(2, Math.round(won * 0.5)),
            pipelineLakhs: Math.round(pipeline * 0.45),
            weightedLakhs: Math.round(weighted * 0.48),
            conversionRate: 24,
            avgDealSize: '₹55.0L',
            speed: '12m'
          },
          {
            id: 'team-2',
            name: 'Priya Sundaram',
            initials: 'PS',
            role: 'SALES_LEAD',
            totalLeads: Math.round(total * 0.28),
            activeLeads: Math.round(active * 0.28),
            wonLeads: Math.max(1, Math.round(won * 0.25)),
            pipelineLakhs: Math.round(pipeline * 0.28),
            weightedLakhs: Math.round(weighted * 0.27),
            conversionRate: 19,
            avgDealSize: '₹42.0L',
            speed: '18m'
          },
          {
            id: 'team-3',
            name: 'Karthik Raja',
            initials: 'KR',
            role: 'ARCHITECT',
            totalLeads: Math.round(total * 0.18),
            activeLeads: Math.round(active * 0.18),
            wonLeads: Math.max(1, Math.round(won * 0.15)),
            pipelineLakhs: Math.round(pipeline * 0.16),
            weightedLakhs: Math.round(weighted * 0.15),
            conversionRate: 16,
            avgDealSize: '₹38.0L',
            speed: '25m'
          },
          {
            id: 'team-4',
            name: 'Ananya Sharma',
            initials: 'AS',
            role: 'INTERIOR_LEAD',
            totalLeads: Math.round(total * 0.12),
            activeLeads: Math.round(active * 0.12),
            wonLeads: Math.max(1, Math.round(won * 0.1)),
            pipelineLakhs: Math.round(pipeline * 0.11),
            weightedLakhs: Math.round(weighted * 0.10),
            conversionRate: 14,
            avgDealSize: '₹28.5L',
            speed: '30m'
          }
        ];

        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          data: { success: true, data: team }
        };
      }

      // 8. GET /analytics/monthly-trends
      if (url.includes('/analytics/monthly-trends') && method === 'get') {
        const wonCount = leads.filter(l => l.stage === 'WON').length;
        const wonValue = leads.filter(l => l.stage === 'WON').reduce((a, b) => a + b.budgetLakhs, 0);

        const months = [
          { month: 'Apr 26', newLeads: 14, wonLeads: 2, wonValueLakhs: 85, activePipelineLakhs: 480, isProjected: false },
          { month: 'May 26', newLeads: 21, wonLeads: 3, wonValueLakhs: 145, activePipelineLakhs: 720, isProjected: false },
          { month: 'Jun 26', newLeads: 28, wonLeads: 5, wonValueLakhs: 230, activePipelineLakhs: 1100, isProjected: false },
          { month: 'Jul 26', newLeads: 35, wonLeads: 6, wonValueLakhs: 290, activePipelineLakhs: 1540, isProjected: false },
          { month: 'Aug 26', newLeads: 48, wonLeads: 7, wonValueLakhs: 340, activePipelineLakhs: 1980, isProjected: false },
          { month: 'Sep 26', newLeads: leads.length, wonLeads: Math.max(wonCount, 4), wonValueLakhs: Math.max(wonValue, 200), activePipelineLakhs: 2430, isProjected: false },
          { month: 'Oct 26 (AI)', newLeads: 84, wonLeads: 11, wonValueLakhs: 490, activePipelineLakhs: 2950, isProjected: true },
          { month: 'Nov 26 (AI)', newLeads: 98, wonLeads: 15, wonValueLakhs: 640, activePipelineLakhs: 3480, isProjected: true },
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
      const leadIdMatch = url.match(/\/leads\/([^\/\?]+)/);
      if (leadIdMatch && !url.includes('/activities') && !url.includes('/bulk-import') && !url.includes('/realign-serials') && method === 'get') {
        const param = leadIdMatch[1];
        const lead = findLeadByAnyId(param);
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
        // Fallback: If not found and leads exist, return first lead instead of 404 hang
        if (leads.length > 0) {
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            config: cfg,
            data: {
              status: 'success',
              data: leads[0]
            }
          };
        }
        return Promise.reject({ response: { status: 404, data: { message: 'Lead not found' } } });
      }

      // 14. PATCH /leads/:id
      if (leadIdMatch && !url.includes('/activities') && method === 'patch') {
        const param = leadIdMatch[1];
        const idx = findLeadIndexByAnyId(param);
        if (idx !== -1) {
          const original = leads[idx];
          const updated = { ...original, ...data, updatedAt: new Date().toISOString() };

          if (data.stage && data.stage !== original.stage) {
            const act = {
              id: `act-${Math.random().toString(36).slice(2, 9)}`,
              leadId: original.id,
              type: 'STAGE_CHANGE',
              text: `Stage changed from ${original.stage} to ${data.stage}.`,
              createdAt: new Date().toISOString(),
              createdById: 'admin-id',
              createdBy: { name: 'Nirmal kumar N' }
            };
            updated.activities = [...(original.activities || []), act];
          }

          leads[idx] = updated;
          localStorage.setItem('bb_leads', JSON.stringify(leads));
          localStorage.setItem('dnd_cached_leads_v5', JSON.stringify(leads));

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
        const param = leadIdMatch[1];
        const idx = findLeadIndexByAnyId(param);
        if (idx !== -1) {
          const original = leads[idx];
          const newAct = {
            id: `act-${Math.random().toString(36).slice(2, 9)}`,
            leadId: original.id,
            type: data.type || 'NOTE',
            text: data.text,
            quote: data.quote,
            createdAt: new Date().toISOString(),
            createdById: 'admin-id',
            createdBy: { name: 'Nirmal kumar N' }
          };
          original.activities = [newAct, ...(original.activities || [])];
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
          projectType: data.projectType || 'Website Building',
          projectDescription: data.projectDescription || '',
          location: data.location || 'Chennai',
          budgetLakhs: data.budgetLakhs || 1.5,
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
              createdBy: { name: 'Nirmal kumar N' }
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

      // 17. POST /ai/prioritize-leads
      if (url.includes('/ai/prioritize-leads') && method === 'post') {
        const active = leads.filter(l => !['WON', 'LOST'].includes(l.stage));
        const prioritized = active.map((l, idx) => ({
          leadId: l.id,
          serialNo: idx + 1,
          name: l.name,
          phone: (l.phone || '').replace(/\D/g, '').slice(-10),
          location: l.location,
          projectType: l.projectType,
          budgetLakhs: l.budgetLakhs,
          stage: l.stage,
          priority: l.priority,
          score: l.stage === 'PROPOSAL' ? 92 : l.stage === 'CALL_BACK' ? 88 : l.stage === 'MEETING' ? 84 : 70,
          urgency: (l.stage === 'PROPOSAL' || l.stage === 'CALL_BACK') ? 'CRITICAL' : 'HIGH',
          conversionLikelihood: l.stage === 'PROPOSAL' ? 85 : 65,
          recommendedAction: l.stage === 'PROPOSAL'
            ? 'Follow up on proposal — close milestone advance'
            : l.stage === 'CALL_BACK'
            ? 'Scheduled callback due — qualify timeline & budget'
            : 'Schedule 15-min Google Meet demonstration',
          aiReason: `High value opportunity (₹${l.budgetLakhs}L) in ${l.location}`,
          bestTimeToCall: '11:00 AM – 1:30 PM (Optimal executive availability)',
          suggestedAngle: `"Vanakkam sir! Following up from DND Studio regarding ${l.projectType}."`,
          priorityRank: idx + 1,
        })).sort((a: any, b: any) => b.score - a.score).map((item, idx) => ({ ...item, priorityRank: idx + 1 }));

        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          data: {
            success: true,
            data: {
              totalActive: prioritized.length,
              criticalCount: prioritized.filter((p: any) => p.urgency === 'CRITICAL').length,
              highCount: prioritized.filter((p: any) => p.urgency === 'HIGH').length,
              pipelineValueLakhs: prioritized.reduce((acc: number, p: any) => acc + p.budgetLakhs, 0),
              prioritizedLeads: prioritized.slice(0, 15),
            }
          }
        };
      }

      // 18. POST /ai/summarize-call
      if (url.includes('/ai/summarize-call') && method === 'post') {
        const { leadId, callText, durationSecs, attended } = data || {};
        const targetLead = leads.find(l => l.id === leadId);
        const mins = Math.floor((durationSecs || 0) / 60);
        const secs = (durationSecs || 0) % 60;
        const durFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          data: {
            success: true,
            data: {
              leadId: leadId || 'mock-id',
              leadName: targetLead?.name || 'Valued Client',
              phone: (targetLead?.phone || '').replace(/\D/g, '').slice(-10),
              sentiment: 'POSITIVE',
              attended: attended ?? true,
              durationFormatted: durFormatted,
              executiveSummary: `Completed productive discussion (${durFormatted}) with ${targetLead?.name || 'client'}. Client expressed keen interest in ${targetLead?.projectType || 'digital platform'} solutions.`,
              actionItems: [
                `Send revised commercial proposal for ₹${targetLead?.budgetLakhs || 2.5}L`,
                'Confirm 15-minute Google Meet walkthrough demo',
                'Share portfolio links on WhatsApp'
              ],
              recommendedNextStage: targetLead?.stage === 'NEW' ? 'MEETING' : 'PROPOSAL',
              winProbabilityDelta: 15,
              suggestedWhatsApp: `*Vanakkam from DND Studio! 🚀*\n\nHi *${targetLead?.name || 'team'}*,\n\nThank you for the wonderful discussion today! We are preparing your custom concept proposal for *${targetLead?.projectType || 'Web & Mobile App'}*.\n\nLooking forward to working together!\n\n— Nirmal kumar, DND Studio\n📞 +91 9342626096`,
            }
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
    if (err.response?.status === 401 && !original._retry && !isDemoMode) {
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
