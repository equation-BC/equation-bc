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
