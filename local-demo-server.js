const http = require('http');
const url = require('url');

const PORT = 4000;

// In-memory data store emulating RDS PostgreSQL
const database = {
  users: [
    { id: 'u1', name: 'Alex Miller', email: 'alex@company.com', role: 'admin', createdAt: new Date().toISOString() },
    { id: 'u2', name: 'Sam Taylor', email: 'sam@company.com', role: 'engineer', createdAt: new Date().toISOString() }
  ],
  items: [
    {
      id: 'task-101',
      title: 'Provision RDS PostgreSQL Multi-AZ',
      description: 'Configured in isolated subnets with KMS encryption and automated backups',
      status: 'COMPLETED',
      priority: 'HIGH',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: { id: 'u1', name: 'Alex Miller', email: 'alex@company.com', role: 'admin' }
    },
    {
      id: 'task-102',
      title: 'Deploy ECS Fargate GraphQL Service',
      description: 'Private container deployment behind internal Application Load Balancer',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: { id: 'u2', name: 'Sam Taylor', email: 'sam@company.com', role: 'engineer' }
    },
    {
      id: 'task-103',
      title: 'Configure CloudWatch Alarms & SNS Topic',
      description: 'Alarms set for Lambda errors, ECS CPU > 80%, and RDS connections',
      status: 'PENDING',
      priority: 'MEDIUM',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: null
    }
  ],
  auditLogs: [
    { action: 'INITIALIZE_CLUSTER', entity: 'ECS Fargate', at: new Date(Date.now() - 7200000).toISOString() },
    { action: 'ATTACH_RDS_STORAGE', entity: 'PostgreSQL gp3', at: new Date(Date.now() - 3600000).toISOString() }
  ]
};

// Clean Platform Console HTML
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Platform Console - Serverless GraphQL</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen">
  <!-- Top Navbar -->
  <header class="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
          <i class="fa-solid fa-chart-line text-sm"></i>
        </div>
        <div>
          <h1 class="text-base font-bold text-white">Platform Console</h1>
          <p class="text-xs text-slate-400">Serverless GraphQL & Infrastructure Management</p>
        </div>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <span class="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> CloudFront + OAC
        </span>
        <span class="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 hidden sm:inline-block">
          <i class="fa-solid fa-server mr-1"></i> ECS Fargate
        </span>
        <span class="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 hidden sm:inline-block">
          <i class="fa-solid fa-database mr-1"></i> RDS Multi-AZ
        </span>
        <a href="/graphql" class="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-indigo-400 font-semibold transition">
          <i class="fa-solid fa-terminal mr-1"></i> GraphQL Explorer
        </a>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 py-8">
    <!-- Header Banner -->
    <div class="mb-8 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-slate-900 to-slate-900 border border-indigo-800/30 shadow-lg">
      <span class="text-[10px] font-bold tracking-widest uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded-full">
        Cloud Operations Console
      </span>
      <h2 class="text-xl sm:text-2xl font-bold text-white mt-3">
        Serverless GraphQL Architecture
      </h2>
      <p class="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
        React frontend hosted on S3 with CloudFront Origin Access Control, connected to TypeScript AWS Lambda handlers, private ECS Fargate tasks, and an isolated Multi-AZ RDS PostgreSQL database.
      </p>
    </div>

    <!-- Metrics Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
        <div class="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
          <span>LAMBDA RESOLVERS</span>
          <i class="fa-solid fa-bolt text-amber-400 text-base"></i>
        </div>
        <div class="text-2xl font-bold text-white">4 Handlers</div>
        <div class="text-xs text-emerald-400 mt-2"><i class="fa-solid fa-check mr-1"></i> ARM64 Graviton • Node 20</div>
      </div>

      <div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
        <div class="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
          <span>ECS FARGATE REPLICAS</span>
          <i class="fa-solid fa-microchip text-blue-400 text-base"></i>
        </div>
        <div class="text-2xl font-bold text-white">2 Tasks</div>
        <div class="text-xs text-blue-400 mt-2"><i class="fa-solid fa-arrows-up-down mr-1"></i> Auto-Scaled (CPU 70%)</div>
      </div>

      <div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
        <div class="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
          <span>RDS POSTGRESQL</span>
          <i class="fa-solid fa-database text-purple-400 text-base"></i>
        </div>
        <div class="text-2xl font-bold text-white">Multi-AZ</div>
        <div class="text-xs text-purple-400 mt-2"><i class="fa-solid fa-lock mr-1"></i> Isolated Subnet • SSL Enforced</div>
      </div>

      <div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
        <div class="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
          <span>CLOUDWATCH ALARMS</span>
          <i class="fa-solid fa-heart-pulse text-emerald-400 text-base"></i>
        </div>
        <div class="text-2xl font-bold text-emerald-400">0 Errors</div>
        <div class="text-xs text-slate-400 mt-2"><i class="fa-solid fa-bell mr-1"></i> SNS Notifications Active</div>
      </div>
    </div>

    <!-- Mutation Form -->
    <div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 mb-8 shadow-sm">
      <h3 class="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <i class="fa-solid fa-plus-circle text-indigo-400"></i> Create New Item via GraphQL Mutation
      </h3>
      <form id="createForm" onsubmit="handleCreate(event)" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="sm:col-span-2">
            <label class="block text-xs font-medium text-slate-300 mb-1">Title</label>
            <input type="text" id="itemTitle" required placeholder="e.g. Set up RDS Read Replica"
              class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Priority</label>
            <select id="itemPriority" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="LOW">LOW</option>
              <option value="MEDIUM" selected>MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end">
          <button type="submit" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2">
            <i class="fa-solid fa-paper-plane text-xs"></i> Execute createItem Mutation
          </button>
        </div>
      </form>
    </div>

    <!-- Items List -->
    <div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-base font-semibold text-white">Managed Items (RDS PostgreSQL)</h3>
          <p class="text-xs text-slate-400">Queried dynamically via GraphQL Query</p>
        </div>
        <button onclick="fetchItems()" class="text-xs bg-slate-900 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 transition">
          <i class="fa-solid fa-rotate mr-1"></i> Refresh
        </button>
      </div>

      <div id="itemsContainer" class="divide-y divide-slate-700/60">
        <!-- Rendered dynamically -->
      </div>
    </div>
  </main>

  <footer class="border-t border-slate-800 py-6 text-center text-xs text-slate-500 mt-12">
    Platform Console • Terraform IaC • GitHub Actions CI/CD • AWS CloudWatch Monitoring
  </footer>

  <script>
    async function fetchItems() {
      const container = document.getElementById('itemsContainer');
      try {
        const res = await fetch('/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: '{ getItems { id title description status priority createdAt } }'
          })
        });
        const data = await res.json();
        const items = data.data?.getItems || [];
        renderItems(items);
      } catch (err) {
        container.innerHTML = '<div class="py-6 text-center text-rose-400 text-sm">Error connecting to GraphQL backend</div>';
      }
    }

    function renderItems(items) {
      const container = document.getElementById('itemsContainer');
      if (items.length === 0) {
        container.innerHTML = '<div class="py-8 text-center text-slate-500 text-sm">No items found. Create one above!</div>';
        return;
      }
      container.innerHTML = items.map(item => \`
        <div class="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-white">\${item.title}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full \${
                item.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                item.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }">\${item.priority}</span>
            </div>
            \${item.description ? \`<p class="text-xs text-slate-400 mt-0.5">\${item.description}</p>\` : ''}
            <span class="text-[11px] text-slate-500 mt-1 inline-block">ID: \${item.id}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs font-semibold px-2.5 py-1 rounded-md \${
              item.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
              item.status === 'IN_PROGRESS' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' :
              'bg-slate-700/40 text-slate-300 border border-slate-600'
            }">\${item.status}</span>
            <button onclick="handleDelete('\${item.id}')" class="text-slate-500 hover:text-rose-400 transition text-sm p-1">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      \`).join('');
    }

    async function handleCreate(e) {
      e.preventDefault();
      const title = document.getElementById('itemTitle').value;
      const priority = document.getElementById('itemPriority').value;

      await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: \`mutation { createItem(input: { title: "\${title}", priority: \${priority} }) { id } }\`
        })
      });

      document.getElementById('itemTitle').value = '';
      fetchItems();
    }

    async function handleDelete(id) {
      if (!confirm('Delete item ' + id + '?')) return;
      await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: \`mutation { deleteItem(id: "\${id}") }\`
        })
      });
      fetchItems();
    }

    // Initial load
    fetchItems();
  </script>
</body>
</html>`;

// HTML GraphQL Playground & Explorer
const PLAYGROUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GraphQL Server</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 30px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; max-width: 900px; margin: 0 auto 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
    h1 { margin-top: 0; color: #60a5fa; font-size: 22px; display: flex; align-items: center; gap: 10px; }
    .badge { background: #10b981; color: #022c22; font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; }
    pre { background: #0b1120; border: 1px solid #1e293b; padding: 16px; border-radius: 8px; overflow-x: auto; color: #38bdf8; font-size: 13px; line-height: 1.5; }
    button { background: #3b82f6; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; transition: 0.2s; }
    button:hover { background: #2563eb; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat { background: #0f172a; padding: 14px; border-radius: 8px; border: 1px solid #334155; }
    .stat-label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; }
    .stat-val { font-size: 18px; font-weight: 700; color: #f1f5f9; margin-top: 4px; }
    textarea { width: 100%; height: 90px; background: #0b1120; border: 1px solid #334155; color: #38bdf8; border-radius: 8px; padding: 10px; font-family: monospace; font-size: 13px; box-sizing: border-box; }
    .nav { max-width: 900px; margin: 0 auto 16px; display: flex; gap: 12px; }
    .nav a { color: #94a3b8; text-decoration: none; font-size: 13px; padding: 6px 12px; border-radius: 6px; background: #1e293b; }
    .nav a:hover, .nav a.active { color: white; background: #334155; }
  </style>
</head>
<body>
  <div class="nav">
    <a href="/app" style="color: #60a5fa; font-weight: 700;">← Open Console UI (/app)</a>
    <a href="/graphql" class="active">GraphQL Explorer</a>
    <a href="/health">Health Check</a>
    <a href="/api/items">REST Items</a>
  </div>

  <div class="card">
    <h1>
      <span>GraphQL Server</span>
      <span class="badge">Running</span>
    </h1>

    <div class="grid">
      <div class="stat">
        <div class="stat-label">Architecture</div>
        <div class="stat-val" style="color: #60a5fa;">ECS Fargate + Lambda</div>
      </div>
      <div class="stat">
        <div class="stat-label">Database</div>
        <div class="stat-val" style="color: #a78bfa;">PostgreSQL 15 (RDS)</div>
      </div>
      <div class="stat">
        <div class="stat-label">CloudWatch</div>
        <div class="stat-val" style="color: #34d399;">Healthy</div>
      </div>
      <div class="stat">
        <div class="stat-label">Secrets</div>
        <div class="stat-val" style="color: #fbbf24;">Secrets Manager (KMS)</div>
      </div>
    </div>

    <h3 style="margin-bottom: 8px; font-size: 14px;">Query Tester</h3>
    <textarea id="queryInput">{
  getItems {
    id
    title
    status
    priority
    createdAt
  }
}</textarea>
    <div style="margin-top: 10px; display: flex; gap: 10px;">
      <button onclick="runQuery()">Run Query</button>
      <button style="background: #475569;" onclick="setHealthQuery()">healthCheck</button>
      <button style="background: #475569;" onclick="setMutation()">createItem</button>
    </div>

    <h3 style="margin-top: 20px; margin-bottom: 8px; font-size: 14px;">Response</h3>
    <pre id="output">Running query...</pre>
  </div>

  <script>
    async function runQuery() {
      const q = document.getElementById('queryInput').value;
      const out = document.getElementById('output');
      out.textContent = 'Querying...';
      try {
        const res = await fetch('/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q })
        });
        const data = await res.json();
        out.textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        out.textContent = 'Error: ' + e.message;
      }
    }

    function setHealthQuery() {
      document.getElementById('queryInput').value = '{\\n  healthCheck\\n}';
      runQuery();
    }

    function setMutation() {
      document.getElementById('queryInput').value = 'mutation {\\n  createItem(input: { title: "Automate Terraform Cloud Plan", priority: HIGH }) {\\n    id\\n    title\\n    status\\n  }\\n}';
      runQuery();
    }

    runQuery();
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: 'CONNECTED',
      engine: 'PostgreSQL 15 (RDS Multi-AZ)'
    }, null, 2));
    return;
  }

  // Web dashboard
  if (pathname === '/app') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(DASHBOARD_HTML);
    return;
  }

  // REST items endpoint
  if (pathname === '/api/items' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: { items: database.items, count: database.items.length } }, null, 2));
    return;
  }

  // Root redirect
  if (pathname === '/' && req.method === 'GET') {
    res.writeHead(302, { Location: '/app' });
    res.end();
    return;
  }

  // GraphQL endpoint
  if (pathname === '/graphql') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(PLAYGROUND_HTML);
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const query = (parsed.query || '').trim();

          if (query.includes('healthCheck')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              data: {
                healthCheck: `GraphQL Server healthy. DB: OK. Timestamp: ${new Date().toISOString()}`
              }
            }));
            return;
          }

          if (query.includes('createItem')) {
            const titleMatch = query.match(/title:\s*"([^"]+)"/);
            const priorityMatch = query.match(/priority:\s*([A-Z_]+)/);
            const newItem = {
              id: 'task-' + (100 + database.items.length + 1),
              title: titleMatch ? titleMatch[1] : 'New Task',
              description: 'Created via GraphQL mutation',
              status: 'PENDING',
              priority: priorityMatch ? priorityMatch[1] : 'MEDIUM',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              assignedTo: null
            };
            database.items.unshift(newItem);
            database.auditLogs.push({ action: 'CREATE_ITEM', item: newItem, at: new Date() });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ data: { createItem: newItem } }));
            return;
          }

          if (query.includes('updateItem')) {
            const idMatch = query.match(/id:\s*"([^"]+)"/);
            const statusMatch = query.match(/status:\s*([A-Z_]+)/);
            if (idMatch) {
              const target = database.items.find(i => i.id === idMatch[1]);
              if (target && statusMatch) {
                target.status = statusMatch[1];
                target.updatedAt = new Date().toISOString();
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ data: { updateItem: target || database.items[0] } }));
              return;
            }
          }

          if (query.includes('deleteItem')) {
            const idMatch = query.match(/id:\s*"([^"]+)"/);
            if (idMatch) {
              const idx = database.items.findIndex(i => i.id === idMatch[1]);
              if (idx !== -1) database.items.splice(idx, 1);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ data: { deleteItem: true } }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            data: {
              getItems: database.items,
              getUsers: database.users
            }
          }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ errors: [{ message: err.message }] }));
        }
      });
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
