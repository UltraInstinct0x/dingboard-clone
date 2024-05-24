export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(import.meta.env.BASE_URL + 'enable-threads.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
          registration.addEventListener('updatefound', () => {
            console.log('Reloading page to make use of updated COOP/COEP Service Worker.');
            window.location.reload();
          });

          // If the registration is active, but it's not controlling the page
          if (registration.active && !navigator.serviceWorker.controller) {
            console.log('Reloading page to make use of COOP/COEP Service Worker.');
            window.location.reload();
          }
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }
}
