const root = document.documentElement;
const savedTheme = localStorage.getItem('theme');
const preferredTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
root.dataset.theme = savedTheme || preferredTheme;

document.querySelector('.theme-toggle').addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = nextTheme;
    localStorage.setItem('theme', nextTheme);
});

const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');

const closeMobileMenu = () => {
    if (!menuToggle || !mobileMenu) {
        return;
    }

    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', menuToggle.dataset.openLabel);
    mobileMenu.hidden = true;
};

if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
        const opening = menuToggle.getAttribute('aria-expanded') !== 'true';
        menuToggle.setAttribute('aria-expanded', String(opening));
        menuToggle.setAttribute('aria-label', opening ? menuToggle.dataset.closeLabel : menuToggle.dataset.openLabel);
        mobileMenu.hidden = !opening;
    });

    mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMobileMenu));

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeMobileMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 940) {
            closeMobileMenu();
        }
    });
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.16
});

document.querySelectorAll('.reveal').forEach((item) => observer.observe(item));

const animateCount = (element) => {
    const target = Number(element.dataset.count || 0);
    const duration = 1200;
    const start = performance.now();

    const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(target * eased);
        element.textContent = value.toLocaleString(root.lang === 'de' ? 'de-DE' : 'en-US');

        if (progress < 1) {
            requestAnimationFrame(tick);
        }
    };

    requestAnimationFrame(tick);
};

const statObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            animateCount(entry.target);
            statObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.5
});

document.querySelectorAll('.metric strong').forEach((stat) => statObserver.observe(stat));

const contactForm = document.querySelector('#contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!contactForm.reportValidity()) return;
        const fields = new FormData(contactForm);
        const name = String(fields.get('name') || '').trim();
        const email = String(fields.get('email') || '').trim();
        const message = String(fields.get('message') || '').trim();
        const subject = `Portfolio contact from ${name}`;
        const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
        window.location.href = `mailto:muneebmansoor98@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
}
