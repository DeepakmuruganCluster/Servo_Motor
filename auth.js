/* Servo Sizing — Auth guard */
(function () {
  if (!sessionStorage.getItem('servo_auth')) {
    // migrate legacy key
    if (sessionStorage.getItem('titan_auth')) {
      sessionStorage.setItem('servo_auth', '1');
      sessionStorage.removeItem('titan_auth');
    } else {
      document.documentElement.style.visibility = 'hidden';
      window.location.replace('login.html');
    }
  }
})();

function logout() {
  sessionStorage.removeItem('servo_auth');
  window.location.replace('login.html');
}
