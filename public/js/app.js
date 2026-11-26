// Main AngularJS module: routes + login guard
angular.module('healthlens', ['ngRoute', 'ngSanitize'])

.config(function ($routeProvider) {
  $routeProvider
    .when('/login', { templateUrl: 'views/login.html', controller: 'LoginCtrl' })
    .when('/chat',  { templateUrl: 'views/chat.html',  controller: 'ChatCtrl', requiresAuth: true })
    .otherwise({ redirectTo: '/login' });
})

.run(function ($rootScope, $location, AuthService) {
  $rootScope.$on('$routeChangeStart', function (event, next) {
    // block /chat when not logged in
    if (next && next.requiresAuth && !AuthService.isLoggedIn()) {
      $location.path('/login');
    }
    // skip the login page when already logged in
    if (next && next.originalPath === '/login' && AuthService.isLoggedIn()) {
      $location.path('/chat');
    }
  });
});
