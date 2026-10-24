/**
 * BALANCED EGYPT: site script
 * Navigation, scroll reveals, counters, article filters, forms, share button.
 */

const BE_CONFIG = {
    contactEmail: "info@balancedegypt.org",
    newsletterEndpoint: "",   // e.g. "https://your-provider.com/subscribe"  (POST, JSON: { email })
    contactEndpoint: ""       // e.g. "https://your-provider.com/contact"    (POST, JSON: form fields)
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("DOMContentLoaded", () => {
    const inits = [
        initNavbarSystem,
        initScrollEngine,
        initCounterEngine,
        initMarquee,
        initMagazineFilterEngine,
        initCaseStudyScrollSync,
        initForms,
        initShareButton
    ];
    inits.forEach(fn => {
        try { fn(); } catch (error) { console.error(`Init warning (${fn.name}):`, error); }
    });
});

/* Run a handler at most once per animation frame */
function onScrollFrame(handler) {
    let ticking = false;
    window.addEventListener("scroll", () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { handler(); ticking = false; });
    }, { passive: true });
    handler();
}

/* ------------------------------------------------------------------
   1. NAVBAR
------------------------------------------------------------------ */
function initNavbarSystem() {
    const navbar = document.querySelector("[data-navbar]");
    const burger = document.querySelector("[data-burger]");
    const menu = document.querySelector("[data-nav-menu]");
    if (!navbar) return;

    const topDarkSection = document.querySelector(
        "main > section:first-of-type.section-dark, .editorial-hero, .detail-hero-layout"
    );

    onScrollFrame(() => {
        const scrolled = window.scrollY > 60;
        navbar.classList.toggle("scrolled", scrolled);

        if (topDarkSection && !scrolled) {
            navbar.classList.add("section-dark-nav");
        } else {
            navbar.classList.remove("section-dark-nav");
        }
    });

    if (!burger || !menu) return;

    const setMenu = (open) => {
        menu.classList.toggle("open", open);
        burger.classList.toggle("active", open);
        burger.setAttribute("aria-expanded", String(open));
        document.body.style.overflow = open ? "hidden" : "";
    };

    burger.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menu.classList.contains("open")) { setMenu(false); burger.focus(); }
    });
    window.matchMedia("(min-width: 993px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });
}

/* ------------------------------------------------------------------
   2. SCROLL PROGRESS + REVEALS
------------------------------------------------------------------ */
function initScrollEngine() {
    const progressBar = document.querySelector("[data-scroll-progress]");
    if (progressBar) {
        onScrollFrame(() => {
            const total = document.documentElement.scrollHeight - window.innerHeight;
            progressBar.style.width = total > 0 ? `${(window.scrollY / total) * 100}%` : "0%";
        });
    }

    const revealItems = document.querySelectorAll(".scroll-reveal, .premium-card, .timeline-node, .roster-card, .matrix-item");

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
        revealItems.forEach(item => item.classList.add("visible"));
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
        });
    }, { threshold: 0.05, rootMargin: "0px 0px 0px 0px" });

    revealItems.forEach(item => {
        item.classList.add("scroll-reveal");
        const rect = item.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
            item.classList.add("visible");
        } else {
            observer.observe(item);
        }
    });
}

/* ------------------------------------------------------------------
   3. STAT COUNTERS
------------------------------------------------------------------ */
function initCounterEngine() {
    const stats = document.querySelectorAll(".stat-number[data-count]");
    if (!stats.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
        stats.forEach(showFinalValue);
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            runCounter(entry.target);
            obs.unobserve(entry.target);
        });
    }, { threshold: 0.2 });

    stats.forEach(stat => {
        const rect = stat.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom >= 0) {
            runCounter(stat);
        } else {
            observer.observe(stat);
        }
    });
}

function decimalsOf(element) {
    const parts = String(element.dataset.count).split(".");
    return parts[1] ? parts[1].length : 0;
}

function showFinalValue(element) {
    const end = parseFloat(element.dataset.count);
    element.textContent = end.toLocaleString("en-US", {
        minimumFractionDigits: decimalsOf(element),
        maximumFractionDigits: decimalsOf(element)
    });
}

function runCounter(element) {
    if (element.classList.contains("counted-complete")) return;
    element.classList.add("counted-complete");

    const end = parseFloat(element.dataset.count);
    const duration = 2000;
    const startTime = performance.now();

    function updateCount(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentVal = easeProgress * end;

        element.textContent = currentVal.toLocaleString("en-US", {
            minimumFractionDigits: decimalsOf(element),
            maximumFractionDigits: decimalsOf(element)
        });

        if (progress < 1) {
            requestAnimationFrame(updateCount);
        } else {
            showFinalValue(element);
        }
    }

    requestAnimationFrame(updateCount);
}

/* ------------------------------------------------------------------
   4. PARTNER LOGO MARQUEE
------------------------------------------------------------------ */
function initMarquee() {
    const track = document.querySelector(".logo-track");
    if (!track || track.dataset.cloned) return;
    track.dataset.cloned = "true";
    if (prefersReducedMotion) return;
    Array.from(track.children).forEach(node => {
        const clone = node.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        clone.querySelectorAll("img").forEach(img => img.setAttribute("alt", ""));
        track.appendChild(clone);
    });
}

/* ------------------------------------------------------------------
   5. ARTICLE SEARCH + FILTERS
------------------------------------------------------------------ */
function initMagazineFilterEngine() {
    const buttons = document.querySelectorAll(".filter-tag");
    if (!buttons.length) return;

    const cards = document.querySelectorAll("#magazine-target-grid article, .featured-cover-story");
    const searchField = document.getElementById("article-search");
    const emptyMessage = document.getElementById("no-results");
    let activeFilter = "all";

    buttons.forEach(b => b.setAttribute("aria-pressed", String(b.classList.contains("active"))));

    const apply = () => {
        const query = searchField ? searchField.value.toLowerCase().trim() : "";
        let visibleCount = 0;
        cards.forEach(card => {
            const matchesFilter = activeFilter === "all" || card.getAttribute("data-category") === activeFilter;
            const matchesQuery = !query || card.textContent.toLowerCase().includes(query);
            const show = matchesFilter && matchesQuery;
            card.style.display = show ? "" : "none";
            if (show) visibleCount++;
        });
        if (emptyMessage) emptyMessage.hidden = visibleCount > 0;
    };

    if (searchField) searchField.addEventListener("input", apply);

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            buttons.forEach(b => { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); });
            btn.classList.add("active");
            btn.setAttribute("aria-pressed", "true");
            activeFilter = btn.getAttribute("data-filter");
            apply();
        });
    });
}

/* ------------------------------------------------------------------
   6. "ON THIS PAGE" INDEX
------------------------------------------------------------------ */
function initCaseStudyScrollSync() {
    const sections = Array.from(document.querySelectorAll(".anchor-section[id]"));
    const links = document.querySelectorAll(".sticky-nav-anchors a, .toc-wrapper a");
    if (!sections.length || !links.length) return;

    onScrollFrame(() => {
        let currentId = "";
        sections.forEach(section => {
            if (window.scrollY >= section.offsetTop - 160) currentId = section.id;
        });
        if (!currentId) return;
        links.forEach(link => {
            const isCurrent = link.getAttribute("href") === `#${currentId}`;
            link.classList.toggle("active", isCurrent);
            if (isCurrent) link.setAttribute("aria-current", "true"); else link.removeAttribute("aria-current");
        });
    });
}

/* ------------------------------------------------------------------
   7. FORMS (NEWSLETTER ONLY - CONTACT FORM HANDLED BY EMAILJS)
------------------------------------------------------------------ */
function getStatusNode(form) {
    let node = form.parentElement.querySelector(":scope > .form-status") || form.querySelector(".form-status");
    if (!node) {
        node = document.createElement("p");
        node.className = "form-status";
        node.setAttribute("role", "status");
        node.setAttribute("aria-live", "polite");
        form.insertAdjacentElement("afterend", node);
    }
    return node;
}

function setStatus(form, state, message) {
    const node = getStatusNode(form);
    node.dataset.state = state;
    node.textContent = message;
}

async function postJson(url, payload) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
}

function initForms() {
    document.querySelectorAll(".newsletter-form").forEach(form => {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const input = form.querySelector('input[type="email"]');
            const button = form.querySelector("button[type='submit']");
            if (!input || !input.value.trim()) { setStatus(form, "error", "Enter your email address to subscribe."); return; }

            if (!BE_CONFIG.newsletterEndpoint) {
                setStatus(form, "error", `Sign-up isn't live yet. Email ${BE_CONFIG.contactEmail} and we'll add you.`);
                return;
            }
            button.disabled = true;
            setStatus(form, "success", "Subscribing…");
            try {
                await postJson(BE_CONFIG.newsletterEndpoint, { email: input.value.trim() });
                form.reset();
                setStatus(form, "success", "You're subscribed. Thank you.");
            } catch (err) {
                setStatus(form, "error", "We couldn't subscribe you right now. Check your connection and try again.");
            } finally {
                button.disabled = false;
            }
        });
    });
}

/* ------------------------------------------------------------------
   8. COPY-LINK SHARE BUTTON
------------------------------------------------------------------ */
function initShareButton() {
    document.querySelectorAll("[data-copy-link]").forEach(button => {
        const original = button.textContent;
        button.addEventListener("click", async () => {
            try {
                if (navigator.share) {
                    await navigator.share({ title: document.title, url: window.location.href });
                    return;
                }
                await navigator.clipboard.writeText(window.location.href);
                button.textContent = "Link copied";
            } catch (err) {
                button.textContent = "Copy the address bar link";
            }
            setTimeout(() => { button.textContent = original; }, 2500);
        });
    });
}

/* ------------------------------------------------------------------
   INITIATIVES CAROUSEL ENGINE
------------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
    const track = document.querySelector(".initiatives-track");
    if (!track) return;

    const cards = Array.from(track.children);
    const nextBtn = document.querySelector(".next-btn");
    const prevBtn = document.querySelector(".prev-btn");
    
    let currentIndex = 0;
    let autoPlayTimer = null;
    const intervalTime = 4000;

    function getCardsPerView() {
        if (window.innerWidth <= 768) return 1;
        if (window.innerWidth <= 1024) return 2;
        return 3;
    }

    function updateCarousel() {
        const cardsPerView = getCardsPerView();
        const maxIndex = Math.max(0, cards.length - cardsPerView);
        
        if (currentIndex > maxIndex) {
            currentIndex = 0;
        }

        const cardWidth = cards[0].getBoundingClientRect().width;
        const gap = 32;
        const moveAmount = currentIndex * (cardWidth + gap);
        
        track.style.transform = `translateX(-${moveAmount}px)`;
    }

    function nextSlide() {
        const cardsPerView = getCardsPerView();
        const maxIndex = Math.max(0, cards.length - cardsPerView);
        
        currentIndex++;
        if (currentIndex > maxIndex) {
            currentIndex = 0;
        }
        updateCarousel();
    }

    function prevSlide() {
        const cardsPerView = getCardsPerView();
        const maxIndex = Math.max(0, cards.length - cardsPerView);
        
        currentIndex--;
        if (currentIndex < 0) {
            currentIndex = maxIndex;
        }
        updateCarousel();
    }

    if (nextBtn) nextBtn.addEventListener("click", () => {
        nextSlide();
        resetAutoPlay();
    });

    if (prevBtn) prevBtn.addEventListener("click", () => {
        prevSlide();
        resetAutoPlay();
    });

    function startAutoPlay() {
        autoPlayTimer = setInterval(nextSlide, intervalTime);
    }

    function resetAutoPlay() {
        clearInterval(autoPlayTimer);
        startAutoPlay();
    }

    track.addEventListener("mouseenter", () => clearInterval(autoPlayTimer));
    track.addEventListener("mouseleave", () => startAutoPlay());

    window.addEventListener("resize", updateCarousel);

    startAutoPlay();
});