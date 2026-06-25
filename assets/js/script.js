/* =========================================
   APPARITION AU SCROLL
========================================== */
const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && revealElements.length) {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealElements.forEach((el) => observer.observe(el));
} else {
  revealElements.forEach((el) => el.classList.add("visible"));
}

/* =========================================
   MENU MOBILE + PAGE ACTIVE
========================================== */
const body = document.body;
const menuToggle = document.getElementById("menuToggle");
const mainMenu = document.getElementById("mainMenu");
const pageName = body.dataset.page;

if (pageName) {
  document.querySelectorAll("[data-page-link]").forEach((link) => {
    if (link.dataset.pageLink === pageName) {
      link.classList.add("is-active");
    }
  });
}

function openMenu() {
  if (!menuToggle || !mainMenu) return;
  mainMenu.classList.add("open");
  menuToggle.setAttribute("aria-expanded", "true");
  body.classList.add("menu-open");
}

function closeMenu() {
  if (!menuToggle || !mainMenu) return;
  mainMenu.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  body.classList.remove("menu-open");
}

function toggleMenu() {
  if (!mainMenu) return;
  const isOpen = mainMenu.classList.contains("open");
  if (isOpen) {
    closeMenu();
  } else {
    openMenu();
  }
}

if (menuToggle && mainMenu) {
  menuToggle.addEventListener("click", toggleMenu);

  mainMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  document.addEventListener("click", (event) => {
    const clickedInsideMenu = mainMenu.contains(event.target);
    const clickedToggle = menuToggle.contains(event.target);

    if (!clickedInsideMenu && !clickedToggle) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) {
      closeMenu();
    }
  });
}

/* =========================================
   BOUTON FLOTTANT CONTACT
========================================== */
const floatingContact = document.querySelector(".floating-contact");

if (floatingContact) {
  floatingContact.addEventListener("click", (event) => {
    const targetSelector = floatingContact.getAttribute("href");
    const target = document.querySelector(targetSelector);

    floatingContact.classList.add("clicked");

    window.setTimeout(() => {
      floatingContact.classList.remove("clicked");
    }, 220);

    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (history.pushState) {
        history.pushState(null, "", targetSelector);
      } else {
        window.location.hash = targetSelector;
      }
    }
  });
}

/* =========================================
   EXPERTISES INTERACTIVES (MAISON + DETAILS)
========================================== */
const hotspots = document.querySelectorAll('.hotspot');
const detailsContent = document.getElementById('house-details-content');

if (hotspots.length > 0 && detailsContent) {
  const defaultTitle = "EQUATION B&C";
  const defaultDesc = "Survolez les points lumineux sur la maison pour plus de détails sur nos expertises.";

  hotspots.forEach(spot => {
    spot.addEventListener('mouseenter', () => {
      hotspots.forEach(el => el.classList.remove('is-active'));
      spot.classList.add('is-active');

      const title = spot.getAttribute('data-title');
      const desc = spot.getAttribute('data-desc');

      detailsContent.style.animation = 'none';
      void detailsContent.offsetWidth; // trigger reflow
      detailsContent.style.animation = 'fadeIn 0.3s ease forwards'; 

      detailsContent.innerHTML = `<h3>${title}</h3><p>${desc}</p>`;
    });

    spot.addEventListener('mouseleave', () => {
      spot.classList.remove('is-active');
      
      detailsContent.style.animation = 'none';
      void detailsContent.offsetWidth; // trigger reflow
      detailsContent.style.animation = 'fadeIn 0.3s ease forwards'; 

      detailsContent.innerHTML = `<h3>${defaultTitle}</h3><p>${defaultDesc}</p>`;
    });
    
    // Pour mobile (tactile)
    spot.addEventListener('click', (e) => {
      e.stopPropagation();
      hotspots.forEach(el => el.classList.remove('is-active'));
      spot.classList.add('is-active');

      const title = spot.getAttribute('data-title');
      const desc = spot.getAttribute('data-desc');

      detailsContent.style.animation = 'none';
      void detailsContent.offsetWidth; // trigger reflow
      detailsContent.style.animation = 'fadeIn 0.3s ease forwards'; 

      detailsContent.innerHTML = `<h3>${title}</h3><p>${desc}</p>`;
    });
  });
  
  document.addEventListener('click', () => {
    hotspots.forEach(el => el.classList.remove('is-active'));
    detailsContent.style.animation = 'none';
    void detailsContent.offsetWidth; // trigger reflow
    detailsContent.style.animation = 'fadeIn 0.3s ease forwards'; 
    detailsContent.innerHTML = `<h3>${defaultTitle}</h3><p>${defaultDesc}</p>`;
  });
}

/* =========================================
   RECUPERATION DES REALISATIONS SUPABASE
========================================== */
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

async function fetchProjects() {
  const homeContainer = document.getElementById("home-projects-container");
  const blogContainer = document.getElementById("blog-projects-container");

  // Si on n'est sur aucune des deux pages concernées, on quitte
  if (!homeContainer && !blogContainer) return;

  try {
    // Si on est sur l'accueil, on limite à 2 projets (les plus récents)
    let query = supabaseClient.from('projects').select('*').order('created_at', { ascending: false });

    if (homeContainer) {
      query = query.limit(2);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (data.length === 0) {
      const emptyMsg = `<div class="projects-empty">
        <p style="margin:0;font-size:1.1rem;">Nos réalisations arrivent bientôt — revenez vite !</p>
      </div>`;
      if (homeContainer) homeContainer.innerHTML = emptyMsg;
      if (blogContainer) blogContainer.innerHTML = emptyMsg;
      return;
    }

    const renderProjects = (projectsToRender) => {
      if (projectsToRender.length === 0) {
        return `<div class="projects-empty" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
          <p style="margin:0;font-size:1.1rem;">Aucune réalisation ne correspond à cette catégorie.</p>
        </div>`;
      }
      return projectsToRender.map(project => {
        let imageHtml = `<img src="${esc(project.image_url)}" alt="${esc(project.title)}" loading="lazy" />`;
        
        if (project.is_before_after && project.image_before_url) {
          imageHtml = `
            <div class="before-after-wrapper" style="--slider-pos: 50%;">
              <div class="before-after-container">
                <img src="${esc(project.image_url)}" alt="${esc(project.title)} (Après)" class="img-after" loading="lazy" />
                <div class="img-before-wrapper">
                  <img src="${esc(project.image_before_url)}" alt="${esc(project.title)} (Avant)" class="img-before" loading="lazy" />
                </div>
                <div class="slider-handle">
                  <div class="slider-handle-circle">
                    <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M15 18l-6-6 6-6" /><path d="M9 18l6-6-6-6" style="transform:translate(6px,0)"/></svg>
                  </div>
                </div>
              </div>
              <input type="range" min="0" max="100" value="50" class="slider-range" oninput="this.parentElement.style.setProperty('--slider-pos', this.value + '%')">
              <div class="before-after-labels"><span class="label-before">Avant</span><span class="label-after">Après</span></div>
            </div>
          `;
        }

        // Structure HTML pour la page d'accueil
        if (homeContainer) {
          return `
            <article class="blog-preview-card card reveal visible">
              ${imageHtml}
              <div>
                <p class="blog-tag">${esc(project.tag)}</p>
                <h3>${esc(project.title)}</h3>
                <p>${esc(project.description)}</p>
              </div>
            </article>
          `;
        }
        // Structure HTML pour la page blog
        else if (blogContainer) {
          return `
            <article class="blog-card card reveal visible">
              ${imageHtml}
              <div class="blog-card-body">
                <p class="blog-tag">${esc(project.tag)}</p>
                <h2>${esc(project.title)}</h2>
                <p>${esc(project.description)}</p>
              </div>
            </article>
          `;
        }
      }).join('');
    };

    if (homeContainer) homeContainer.innerHTML = renderProjects(data);
    
    if (blogContainer) {
      blogContainer.innerHTML = renderProjects(data);

      const filtersContainer = document.getElementById("blog-filters-container");
      if (filtersContainer) {
        const uniqueTags = [...new Set(data.map(p => p.tag))].filter(Boolean);
        
        if (uniqueTags.length > 0) {
          let filtersHtml = `<button class="filter-btn active" data-filter="all">Tout afficher</button>`;
          uniqueTags.forEach(tag => {
            filtersHtml += `<button class="filter-btn" data-filter="${esc(tag)}">${esc(tag)}</button>`;
          });
          filtersContainer.innerHTML = filtersHtml;

          const btns = filtersContainer.querySelectorAll('.filter-btn');
          btns.forEach(btn => {
            btn.addEventListener('click', (e) => {
              btns.forEach(b => b.classList.remove('active'));
              e.target.classList.add('active');
              
              const filterVal = e.target.getAttribute('data-filter');
              const filteredData = filterVal === 'all' ? data : data.filter(p => p.tag === filterVal);
              
              blogContainer.innerHTML = renderProjects(filteredData);
            });
          });
        }
      }
    }

  } catch (err) {
    console.error("Erreur de récupération des projets:", err.message);
    const errMsg = `<div class="projects-error">
      <p style="margin:0;">Impossible de charger les réalisations pour le moment. Veuillez réessayer plus tard.</p>
    </div>`;
    if (homeContainer) homeContainer.innerHTML = errMsg;
    if (blogContainer) blogContainer.innerHTML = errMsg;
  }
}

// Lancer la récupération une fois le DOM chargé
if (typeof supabaseClient !== 'undefined') {
  fetchProjects();
}
