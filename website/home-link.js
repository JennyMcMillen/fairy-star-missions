/* Small "Home" button so Fairy Star Missions can hop back to the family dashboard on the same site. */
(function(){'use strict';
 function add(){if(document.getElementById('fsm-home-link'))return;
  var a=document.createElement('a');a.id='fsm-home-link';a.href='./home/';a.setAttribute('aria-label','Back to the family dashboard');a.textContent='⌂ Home';
  a.style.cssText='position:fixed;left:50%;top:max(14px,env(safe-area-inset-top));transform:translateX(-50%);z-index:9999;'+
   'font:600 15px -apple-system,BlinkMacSystemFont,sans-serif;color:#2a2338;background:rgba(255,255,255,.86);border:1px solid rgba(42,35,56,.15);'+
   'border-radius:999px;padding:9px 16px;text-decoration:none;box-shadow:0 4px 14px rgba(42,35,56,.18)';
  document.body.appendChild(a);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
})();
