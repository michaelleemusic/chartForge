// chartForge - Authentication Module

export async function checkAuthStatus() {
  try {
    const res = await fetch('api/auth/status');
    const data = await res.json();
    return data.authenticated;
  } catch (e) {
    console.error('Failed to check auth status:', e);
    return false;
  }
}

export function redirectToGateway() {
  window.location.href = 'ml.html';
}
