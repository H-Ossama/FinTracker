import express, { Request, Response } from 'express';

const router = express.Router();

// Landing page HTML - served directly from code
const landingPageHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FinTracker API - Financial Management Made Simple</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary-color: #6366f1;
            --primary-dark: #4f46e5;
            --secondary-color: #ec4899;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --dark-bg: #0f172a;
            --light-bg: #1e293b;
            --card-bg: #1e293b;
            --text-primary: #f1f5f9;
            --text-secondary: #cbd5e1;
            --border-color: #334155;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, var(--dark-bg) 0%, #1a1f35 100%);
            color: var(--text-primary);
            line-height: 1.6;
            overflow-x: hidden;
        }

        /* Animated background */
        .background-animation {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, var(--dark-bg) 0%, #1a1f35 100%);
            z-index: -1;
            overflow: hidden;
        }

        .blob {
            position: absolute;
            opacity: 0.1;
            filter: blur(80px);
            animation: float 15s infinite ease-in-out;
        }

        .blob-1 {
            width: 400px;
            height: 400px;
            background: var(--primary-color);
            top: -10%;
            left: -5%;
            animation-delay: 0s;
        }

        .blob-2 {
            width: 350px;
            height: 350px;
            background: var(--secondary-color);
            bottom: -5%;
            right: -5%;
            animation-delay: 2s;
        }

        .blob-3 {
            width: 300px;
            height: 300px;
            background: var(--success-color);
            top: 50%;
            right: 5%;
            animation-delay: 4s;
        }

        @keyframes float {
            0%, 100% { transform: translate(0, 0); }
            33% { transform: translate(30px, -30px); }
            66% { transform: translate(-20px, 20px); }
        }

        /* Main content */
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 1;
        }

        header {
            text-align: center;
            padding: 60px 20px 40px;
        }

        .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin-bottom: 20px;
        }

        .logo {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: bold;
        }

        h1 {
            font-size: 3.5rem;
            margin-bottom: 15px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 800;
        }

        .tagline {
            font-size: 1.3rem;
            color: var(--text-secondary);
            margin-bottom: 40px;
            font-weight: 300;
        }

        /* API Info Section */
        .api-info-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 25px;
            margin-bottom: 50px;
        }

        .info-card {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(236, 72, 153, 0.1));
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 30px;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .info-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.1));
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .info-card:hover {
            border-color: var(--primary-color);
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(99, 102, 241, 0.2);
        }

        .info-card:hover::before {
            opacity: 1;
        }

        .card-icon {
            font-size: 2.5rem;
            margin-bottom: 15px;
            display: block;
        }

        .card-label {
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-secondary);
            margin-bottom: 8px;
            font-weight: 600;
        }

        .card-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
            word-break: break-all;
            font-family: 'Courier New', monospace;
        }

        /* Endpoints Section */
        .endpoints-section {
            margin-bottom: 50px;
        }

        .section-title {
            font-size: 2rem;
            margin-bottom: 30px;
            color: var(--text-primary);
            font-weight: 700;
        }

        .endpoints-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }

        .endpoint-item {
            background: rgba(99, 102, 241, 0.05);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 15px 20px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            color: var(--primary-color);
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }

        .endpoint-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: rgba(99, 102, 241, 0.1);
            transition: left 0.3s ease;
        }

        .endpoint-item:hover {
            border-color: var(--primary-color);
            transform: translateX(5px);
        }

        .endpoint-item:hover::before {
            left: 100%;
        }

        /* CTA Buttons Section */
        .cta-section {
            margin-bottom: 50px;
            text-align: center;
        }

        .buttons-container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
            align-items: center;
        }

        .btn {
            padding: 15px 40px;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            position: relative;
            overflow: hidden;
        }

        .btn::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }

        .btn:hover::before {
            width: 300px;
            height: 300px;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
            color: white;
            box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
        }

        .btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(99, 102, 241, 0.4);
        }

        .btn-secondary {
            background: transparent;
            color: var(--text-primary);
            border: 2px solid var(--border-color);
        }

        .btn-secondary:hover {
            border-color: var(--secondary-color);
            color: var(--secondary-color);
            background: rgba(236, 72, 153, 0.1);
            transform: translateY(-3px);
        }

        .btn-success {
            background: linear-gradient(135deg, var(--success-color), #059669);
            color: white;
            box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        }

        .btn-success:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(16, 185, 129, 0.4);
        }

        /* Status Badge */
        .status-badge {
            display: inline-block;
            background: linear-gradient(135deg, var(--success-color), #059669);
            color: white;
            padding: 8px 16px;
            border-radius: 50px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 20px;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        /* Footer */
        footer {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-secondary);
            border-top: 1px solid var(--border-color);
            margin-top: 50px;
        }

        .footer-content {
            margin-bottom: 20px;
        }

        .footer-links {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .footer-links a {
            color: var(--primary-color);
            text-decoration: none;
            transition: color 0.3s ease;
        }

        .footer-links a:hover {
            color: var(--secondary-color);
        }

        /* Responsive */
        @media (max-width: 768px) {
            h1 {
                font-size: 2.5rem;
            }

            .tagline {
                font-size: 1.1rem;
            }

            .section-title {
                font-size: 1.5rem;
            }

            .buttons-container {
                flex-direction: column;
            }

            .btn {
                width: 100%;
                justify-content: center;
            }

            .api-info-section {
                grid-template-columns: 1fr;
            }

            header {
                padding: 40px 20px 30px;
            }
        }

        /* Icon styles */
        .icon {
            display: inline-block;
            width: 20px;
            height: 20px;
        }

        /* Health Status Real-time */
        .health-status {
            margin-top: 20px;
            padding: 15px;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid var(--success-color);
            border-radius: 8px;
            font-size: 0.9rem;
        }

        .health-status.loading {
            background: rgba(59, 130, 246, 0.1);
            border-color: #3b82f6;
        }

        .health-status.error {
            background: rgba(239, 68, 68, 0.1);
            border-color: var(--danger-color);
        }

        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--success-color);
            animation: blink 2s infinite;
            margin-right: 8px;
        }

        .health-status.error .status-indicator {
            background: var(--danger-color);
            animation: none;
        }

        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <!-- Animated Background -->
    <div class="background-animation">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
    </div>

    <!-- Main Container -->
    <div class="container">
        <!-- Header -->
        <header>
            <div class="logo-container">
                <div class="logo">💰</div>
                <h1>FinTracker</h1>
            </div>
            <p class="tagline">Your Smart Financial Management API</p>
            <div class="status-badge">✓ API Server Active</div>
        </header>

        <!-- API Info Cards -->
        <section class="api-info-section">
            <div class="info-card">
                <span class="card-icon">📦</span>
                <div class="card-label">Version</div>
                <div class="card-value" id="version">1.0.0</div>
            </div>
            <div class="info-card">
                <span class="card-icon">⏰</span>
                <div class="card-label">Server Time</div>
                <div class="card-value" id="timestamp" style="font-size: 0.9rem;"></div>
            </div>
            <div class="info-card">
                <span class="card-icon">🔌</span>
                <div class="card-label">Port</div>
                <div class="card-value" id="port">8080</div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="cta-section">
            <div class="buttons-container">
                <a href="https://github.com/H-Ossama/FinTracker" target="_blank" class="btn btn-primary">
                    <span>🔗</span> View on GitHub
                </a>
                <a href="https://github.com/H-Ossama/FinTracker/releases" target="_blank" class="btn btn-success">
                    <span>📥</span> Download APK
                </a>
                <a href="/api/docs" class="btn btn-secondary">
                    <span>📚</span> API Documentation
                </a>
            </div>
        </section>

        <!-- Available Endpoints -->
        <section class="endpoints-section">
            <h2 class="section-title">📡 Available Endpoints</h2>
            <div class="endpoints-grid" id="endpoints-container">
                <!-- Will be populated by JavaScript -->
            </div>
        </section>

        <!-- Health Status -->
        <section>
            <div class="health-status loading" id="health-status">
                <span class="status-indicator"></span>
                <span id="health-text">Checking server health...</span>
            </div>
        </section>

        <!-- Footer -->
        <footer>
            <div class="footer-content">
                <p>&copy; 2025 FinTracker - Financial Management Made Simple</p>
            </div>
            <div class="footer-links">
                <a href="https://github.com/H-Ossama/FinTracker" target="_blank">GitHub</a>
                <a href="https://github.com/H-Ossama/FinTracker/releases" target="_blank">Releases</a>
                <a href="/api/docs" target="_blank">Documentation</a>
                <a href="/health" target="_blank">Health Check</a>
            </div>
        </footer>
    </div>

    <script>
        // Format timestamp
        function formatTimestamp(date) {
            return new Date(date).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        }

        // Update timestamp
        function updateTimestamp() {
            const timestamp = new Date().toISOString();
            document.getElementById('timestamp').textContent = formatTimestamp(timestamp);
        }

        // Initialize
        updateTimestamp();
        setInterval(updateTimestamp, 1000);

        // Populate endpoints
        const endpoints = [
            '/api/auth',
            '/api/users',
            '/api/wallets',
            '/api/transactions',
            '/api/categories',
            '/api/reminders',
            '/api/goals',
            '/api/analytics',
            '/api/notifications',
            '/api/recurring-transactions',
            '/api/smart-alerts',
            '/api/sync',
        ];

        const endpointsContainer = document.getElementById('endpoints-container');
        endpoints.forEach(endpoint => {
            const item = document.createElement('div');
            item.className = 'endpoint-item';
            item.textContent = endpoint;
            item.style.cursor = 'copy';
            item.title = 'Click to copy endpoint';
            item.addEventListener('click', () => {
                navigator.clipboard.writeText(endpoint);
                const originalText = item.textContent;
                item.textContent = '✓ Copied!';
                setTimeout(() => {
                    item.textContent = originalText;
                }, 1500);
            });
            endpointsContainer.appendChild(item);
        });

        // Check health status
        async function checkHealth() {
            try {
                const response = await fetch('/health');
                const data = await response.json();
                
                const healthStatus = document.getElementById('health-status');
                const healthText = document.getElementById('health-text');
                
                if (response.ok && data.status === 'OK') {
                    healthStatus.className = 'health-status';
                    const uptime = Math.floor(data.uptime);
                    const hours = Math.floor(uptime / 3600);
                    const minutes = Math.floor((uptime % 3600) / 60);
                    healthText.innerHTML = \`<strong>✓ Server Healthy</strong> - Database Connected - Uptime: \${hours}h \${minutes}m\`;
                } else {
                    healthStatus.className = 'health-status error';
                    healthText.innerHTML = \`<strong>⚠ Server Issue</strong> - Database Status: \${data.database || 'unknown'}\`;
                }
            } catch (error) {
                const healthStatus = document.getElementById('health-status');
                const healthText = document.getElementById('health-text');
                healthStatus.className = 'health-status error';
                healthText.innerHTML = '<strong>✗ Server Unreachable</strong> - Connection failed';
            }
        }

        // Check health on load and periodically
        checkHealth();
        setInterval(checkHealth, 30000); // Check every 30 seconds
    </script>
</body>
</html>`;

// Serve landing page
router.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(landingPageHTML);
});

export default router;
