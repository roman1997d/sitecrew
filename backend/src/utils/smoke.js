const baseUrl = process.env.API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${text}`);
  }

  return body;
}

async function smoke() {
  const email = `smoke.worker.${Date.now()}@sitecrew.test`;

  const health = await request('/api/health');
  console.log('health:', health.ok);

  const registration = await request('/api/auth/register-worker', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: 'password123',
      fullName: 'Smoke Worker',
      trades: ['Carpentry'],
      city: 'Manchester',
    }),
  });
  console.log('registered:', registration.user.email);

  const me = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${registration.token}` },
  });
  console.log('me:', me.user.role);

  const feed = await request('/api/feed');
  console.log('feed posts:', feed.posts.length);

  const jobs = await request('/api/jobs');
  console.log('jobs:', jobs.jobs.length);
}

smoke().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
