window.onload = () => {
  const galleryBtn = document.getElementById('galleryBtn');
  const swiperContainer = document.getElementsByClassName('swiper-container')[0];

  galleryBtn.addEventListener('click', e => {
    let state = e.target.getAttribute('state');
    if (state === 'true') {
      e.target.setAttribute('state', false);
      swiperContainer.style.visibility = 'visible';
      e.target.style.backgroundImage = "url('./img/galleryActive.png')";
    } else {
      e.target.setAttribute('state', true);
      swiperContainer.style.visibility = 'hidden';
      e.target.style.backgroundImage = "url('./img/gallery.png')";
    }
  });
};
