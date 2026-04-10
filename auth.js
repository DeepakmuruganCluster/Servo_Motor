/* TITAN Servo Sizing — Auth guard */
(function () {
  if (!sessionStorage.getItem('titan_auth')) {
    document.documentElement.style.visibility = 'hidden';
    window.location.replace('login.html');
  }
})();

function logout() {
  sessionStorage.removeItem('titan_auth');
  window.location.replace('login.html');
}
