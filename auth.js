/* TITAN Servo Sizing — Auth guard
   Include on every protected page before other scripts.
   Redirects to login.html if the user is not authenticated. */
(function () {
  if (!sessionStorage.getItem('titan_auth')) {
    window.location.replace('login.html');
  }
})();
