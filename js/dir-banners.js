(function(){
  if(document.querySelector('[data-dir-banners="1"]')) return;
  var w=document.createElement('div');
  w.setAttribute('data-dir-banners','1');
  w.style.cssText='display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin:16px 0;';
  w.innerHTML=''
    +'<a href="https://ffa-links.de/ref/1ba6d92586ce8afb74" target="_blank" rel="noopener"><img src="https://ffa-links.de/banner.svg" alt="FFA-Links" height="60" style="border-radius:4px;"></a>'
    +'<a href="https://swiss-quality.de/ref/a1f265bbf95f1d02f1" target="_blank" rel="noopener"><img src="https://swiss-quality.de/banner.svg" alt="Swiss Quality" height="60" style="border-radius:4px;"></a>'
    +'<a href="https://german-quality.net/ref/9b7c49b71dc76bfdbe" target="_blank" rel="noopener"><img src="https://german-quality.net/banner.svg" alt="German Quality" height="60" style="border-radius:4px;"></a>';
  var foot=document.querySelector('footer');
  if(foot){
    if(foot.parentNode) foot.parentNode.insertBefore(w, foot.nextSibling);
    else foot.appendChild(w);
  } else if(document.body) document.body.appendChild(w);
})();
