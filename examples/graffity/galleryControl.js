(function() {
    var moving = false;
    document.addEventListener('touchmove', function(e) {
        e.preventDefault();
    });
    var swiper = new Swiper('.swiper-container', {
        slidesPerView: 6,
        centeredSlides: false,
        paginationClickable: false,
        spaceBetween: 5,
        setWrapperSize: true,
        spaceBetween: 16.5,
        direction: 'vertical',
        slidesOffsetBefore: 5,
        slidesOffsetAfter: 5,
        roundLengths: true,
        /**
         @todo: prevent double tap
         */
        onSliderMove: function(swiper, e) {
            moving = true;
        },
        onTap: function(swiper, e) {
            window.app.scene.children[0].lookAt(new THREE.Vector3(0,0,0));

            window.app.raycaster.setFromCamera(
                {x: 0, y: 0},
                window.app.camera
            );

            let transform = new THREE.Matrix4();
            transform.scale(new THREE.Vector3(0.1, 0.1, 0.1));
            transform = transform.toArray();
            transform = window.app.ar.createARMatrix(transform);

            let modelId = e.target.getAttribute('modelid');
            window.app.ar.addAnchor(
                null,
                transform
            ).then(info => window.app.onARAddObject(info, modelId));
        },
        onTouchEnd: function(swiper, e) {
            moving = false;
        }
    })
}());

window.onload = () => {
  const galleryBtn = document.getElementById('galleryBtn');
  const removeBtn = document.getElementById('removeObject');
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

    removeBtn.addEventListener('click', e => {
        window.app.removePickedMesh();
    });
};
