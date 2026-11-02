const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reducedMotion && 'IntersectionObserver' in window) {
    const items = document.querySelectorAll('.about-grid, .experience-grid > h2, .job, .work-heading, .project, .tool-grid article, .education');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08 });
    items.forEach(item => { item.classList.add('reveal'); observer.observe(item); });
    document.documentElement.classList.add('motion-ready');
}

const readSetting = (key, fallback) => {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
};
const saveSetting = (key, value) => {
    try { localStorage.setItem(key, value); } catch { /* Private browsing may block storage. */ }
};
const modeControl = document.querySelector('.mode-control');
const soundControl = document.querySelector('.sound-control');
let soundOn = readSetting('preview-sound', 'off') === 'on';
let audioContext;
function clickSound(kind = 'tap') {
    if (!soundOn) return;
    try {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        audioContext ||= new Context();
        if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(kind === 'open' ? 440 : kind === 'theme' ? 620 : 780, now);
        oscillator.frequency.exponentialRampToValueAtTime(kind === 'open' ? 880 : 300, now + .09);
        gain.gain.setValueAtTime(.0001, now);
        gain.gain.exponentialRampToValueAtTime(.035, now + .008);
        gain.gain.exponentialRampToValueAtTime(.0001, now + .14);
        oscillator.connect(gain); gain.connect(audioContext.destination);
        oscillator.start(now); oscillator.stop(now + .15);
    } catch { /* All interactions work even if browser audio is unavailable. */ }
}
function updateSound() {
    soundControl.setAttribute('aria-pressed', String(soundOn));
    soundControl.setAttribute('aria-label', soundOn ? 'Turn click sounds off' : 'Turn click sounds on');
    soundControl.querySelector('.sound-label').textContent = soundOn ? 'Sound on' : 'Sound off';
}
updateSound();
soundControl.addEventListener('click', () => {
    soundOn = !soundOn;
    saveSetting('preview-sound', soundOn ? 'on' : 'off');
    updateSound();
    if (soundOn) clickSound();
});
function applyMode(mode) {
    document.documentElement.dataset.mode = mode;
    modeControl.querySelector('.mode-label').textContent = mode === 'night' ? 'Day' : 'Night';
    modeControl.querySelector('.mode-icon').textContent = mode === 'night' ? '☀' : '☾';
    modeControl.setAttribute('aria-label', `Switch to ${mode === 'night' ? 'day' : 'night'} mode`);
}
applyMode(readSetting('preview-mode', 'night') === 'day' ? 'day' : 'night');
let switchingMode = false;
modeControl.addEventListener('click', async event => {
    if (switchingMode) return;
    const mode = document.documentElement.dataset.mode === 'night' ? 'day' : 'night';
    const bounds = modeControl.getBoundingClientRect();
    document.documentElement.style.setProperty('--wipe-x', `${event.clientX || bounds.x + bounds.width / 2}px`);
    document.documentElement.style.setProperty('--wipe-y', `${event.clientY || bounds.y + bounds.height / 2}px`);
    const update = () => { applyMode(mode); saveSetting('preview-mode', mode); };
    if (document.startViewTransition && !reducedMotion) {
        switchingMode = true;
        try { await document.startViewTransition(update).finished; } finally { switchingMode = false; }
    } else update();
});
document.addEventListener('click', event => {
    const control = event.target.closest('a, button');
    if (!control || control === soundControl) return;
    clickSound(control.matches('.deck-card') ? 'open' : control === modeControl ? 'theme' : 'tap');
});
const menu = document.querySelector('.floating-menu');
const indicator = menu.querySelector('.menu-indicator');
const menuLinks = [...menu.querySelectorAll('a')];
// Static markers stay in normal flow even when their sections are sticky.
const menuTargets = menuLinks.map(link => {
    const section = document.querySelector(link.hash);
    const marker = document.createElement('div');
    marker.className = 'navigation-marker';
    marker.setAttribute('aria-hidden', 'true');
    section.before(marker);
    return { link, section, marker };
});
const targetTop = target => target.marker.getBoundingClientRect().top + window.scrollY;
function activateLink(link) {
    menuLinks.forEach(item => {
        item.classList.toggle('active', item === link);
        if (item === link) item.setAttribute('aria-current', 'location');
        else item.removeAttribute('aria-current');
    });
    const padding = parseFloat(getComputedStyle(menu).paddingLeft);
    indicator.style.width = `${link.offsetWidth}px`;
    indicator.style.transform = `translateX(${link.offsetLeft - padding}px)`;
}
let navigationTarget = null;
let settleTimer;
function finishNavigation() {
    navigationTarget = null;
    clearTimeout(settleTimer);
    trackSection();
}
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = menuTargets.find(item => item.link.hash === link.hash);
    if (!target) return;
    event.preventDefault();
    navigationTarget = target.link;
    activateLink(target.link);
    window.scrollTo({ top: link.hash === '#home' ? 0 : Math.max(0, targetTop(target) - 30), behavior: reducedMotion ? 'instant' : 'smooth' });
    history.replaceState(null, '', link.hash);
    clearTimeout(settleTimer);
    settleTimer = setTimeout(finishNavigation, reducedMotion ? 0 : 1200);
}));
// Explicit user scrolling takes over from a menu-initiated scroll.
window.addEventListener('wheel', finishNavigation, { passive: true });
window.addEventListener('touchstart', event => {
    if (!event.target.closest('.floating-menu')) finishNavigation();
}, { passive: true });
window.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) finishNavigation();
});
let scrollFrame;
function trackSection() {
    if (navigationTarget) { activateLink(navigationTarget); return; }
    const anchor = innerHeight * .35;
    let current = menuLinks[0];
    const readingPosition = window.scrollY + anchor;
    menuTargets.forEach(target => {
        if (targetTop(target) <= readingPosition) current = target.link;
    });
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 5) current = menuLinks.at(-1);
    activateLink(current);
}
window.addEventListener('scroll', () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(trackSection);
    if (navigationTarget) {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(finishNavigation, 160);
    }
}, { passive: true });
window.addEventListener('resize', trackSection);
trackSection();
document.fonts?.ready.then(trackSection);
window.addEventListener('load', trackSection);
if ('ResizeObserver' in window) new ResizeObserver(() => requestAnimationFrame(trackSection)).observe(menu);

const projectStories = {
    invoicing: {
        title: 'Invoice Management System', category: 'BILLING / CLIENT & PAYMENT MANAGEMENT',
        summary: 'A web-based billing application that brings client records, invoice creation, email delivery, PDF documents, and payment tracking into one workflow.',
        tags: ['PHP / CodeIgniter 4', 'jQuery', 'Dompdf', 'PHPMailer', 'PayPal'],
        context: 'Businesses need to manage clients, prepare itemized invoices, share them with customers, and keep track of payments without moving between disconnected tools.',
        contributions: ['Client management and invoice creation with line items, quantities, currency selection, due-date fields, and fixed or percentage discounts.', 'Invoice editing, status management, and an account dashboard with paid/unpaid summaries, monthly charts, and recent activity.', 'Email delivery with configurable SMTP settings and customer invoice links that use access hashes.', 'A4 PDF invoice generation using Dompdf, with configurable invoice branding and footer settings.', 'PayPal checkout integration and an IPN handler for payment notifications, alongside manual paid/unpaid updates and payment email notifications.'],
        contributionHeading: 'Implemented features',
        outcome: 'Connects invoice preparation, customer delivery, PDF access, and payment visibility within a single application.',
        steps: ['Prepare invoice', 'Email customer', 'View / download PDF', 'Track payment'],
        statuses: ['Select a client, add line items, choose a currency, and apply any discount.', 'Share the invoice with the customer by email.', 'The customer opens their invoice link and can access a PDF copy.', 'Payment records and invoice status support the billing dashboard. No payment is processed in this demonstration.'],
        sourceNote: 'Description based on a review of the supplied application source. The application and live payment flow have not been run or verified. This workflow is a portfolio demonstration.'
    },
    tradelinks: {
        title: 'TRADELINKS', category: 'MULTI-ASSET TRADING PLATFORM',
        summary: 'A trading environment for investors and brokers, designed for efficient trading across multiple asset classes.',
        tags: ['Order execution', 'Real-time market data', 'Technical analysis'],
        context: 'Investors and brokers need timely market information and tools to make informed decisions and execute trades efficiently.',
        contributions: ['Low-latency order execution.', 'Advanced charting and technical analysis.', 'Real-time market data feeds.', 'Risk management dashboard.', 'Mobile and web accessibility.'],
        contributionHeading: 'Platform features',
        outcome: 'Brings market data, analysis, trade execution, and risk monitoring into one trading environment.',
        steps: ['View market data', 'Analyze charts', 'Place order', 'Monitor risk'],
        statuses: ['Real-time market information informs the trading workflow.', 'Charting tools support technical analysis.', 'The order execution stage is illustrated. No trade is placed.', 'The dashboard supports risk monitoring.']
    },
    onboarding: {
        title: 'Digital Onboarding Portal', category: 'PRE-TRADING REGISTRATION',
        summary: 'A dedicated portal where users register themselves before they begin trading.',
        tags: ['User registration', 'Digital onboarding', 'Pre-trading workflow'],
        context: 'Users need a dedicated registration process before they start trading.',
        contributions: ['A self-service registration portal for users preparing to trade.'],
        contributionHeading: 'What the portal does',
        outcome: 'Provides a digital entry point for registration before trading.',
        steps: ['Open portal', 'Enter details', 'Submit registration'],
        statuses: ['The user opens the onboarding portal.', 'The user enters their registration information.', 'The registration is submitted. This demonstration does not create an account.']
    },
    protocol: {
        title: 'ProtocolHero', category: 'DIGITAL INSPECTION SAAS',
        summary: 'A cloud-based no-code platform for structured inspection reports and audit-ready trade documentation.',
        tags: ['PostgreSQL', 'Docker', 'Inspection workflows'],
        context: 'Trade businesses need flexible inspection protocols that can capture complex, nested data and keep documentation clear and consistent.',
        contributions: ['Built and maintained a customizable drag-and-drop protocol builder.', 'Designed PostgreSQL structures for nested protocol and inspection data.', 'Contributed to AI-assisted validation to identify documentation gaps and support plausibility checks.', 'Implemented real-time notifications, workflow updates, search, and filtering.', 'Improved query performance and maintainability, and containerized the application with Docker.'],
        outcome: 'Enabled businesses to create and customize structured inspection reports without coding.',
        steps: ['Create protocol', 'Capture data', 'Validate', 'Notify team'],
        statuses: ['A structured inspection template is ready.', 'Inspection records have been captured.', 'Documentation is checked for missing information.', 'The team receives a workflow update.']
    },
    automotive: {
        title: 'Automotive Trade Management', category: 'BUSINESS OPERATIONS PLATFORM',
        summary: 'A multilingual vehicle trade platform supporting more than 500 users, from sales ticketing to internal transaction tracking.',
        tags: ['Role-based access', 'Background jobs', 'Multilingual workflows'],
        context: 'Vehicle sales and internal transactions need clear workflows, controlled access, and dependable recurring data processing.',
        contributions: ['Built ticketing and workflow features for vehicle sales and transaction tracking.', 'Implemented role-based access control and permission management.', 'Designed user-friendly vehicle management interfaces.', 'Added scheduled background jobs and cron-based automation for recurring processing.'],
        outcome: 'Supported 500+ users. Vehicle management interfaces improved user engagement by 40%.',
        steps: ['Check access', 'Create ticket', 'Track transaction', 'Schedule job'],
        statuses: ['Role permissions are checked.', 'A vehicle sales ticket is created.', 'The internal transaction is tracked.', 'Recurring processing is scheduled.']
    }
};
const dialog = document.querySelector('.project-dialog');
let previousFocus;
let demoIndex = -1;
let currentProject;
function closeProject() { dialog.close(); }
document.querySelector('.close-project').addEventListener('click', closeProject);
dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeProject();
});
dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    previousFocus?.focus({ preventScroll: true });
});
document.querySelectorAll('.deck-card').forEach(card => {
    card.addEventListener('click', () => {
        previousFocus = card;
        currentProject = projectStories[card.dataset.project];
        demoIndex = -1;
        const project = currentProject;
        document.querySelector('#project-story').innerHTML = `<div class="story-hero ${card.dataset.project === 'automotive' ? 'automotive-story' : card.dataset.project === 'tradelinks' ? 'tradelinks-story' : ''}"><span class="eyebrow">${project.category}</span><h2 id="project-title">${project.title}</h2><p>${project.summary}</p><div class="story-tags">${project.tags.map(tag => `<span>${tag}</span>`).join('')}</div></div><div class="story-body"><h3>The business problem</h3><p>${project.context}</p><h3>${project.contributionHeading || 'What I contributed'}</h3><ul>${project.contributions.map(item => `<li>${item}</li>`).join('')}</ul>${project.steps.length ? `<div class="workflow-demo"><span class="eyebrow">EXPLORE THE WORKFLOW</span><div class="demo-steps">${project.steps.map(step => `<span class="demo-step">${step}</span>`).join('')}</div><div class="demo-status" role="status" aria-live="polite">Follow a simplified workflow, one step at a time.</div><button type="button" class="demo-next">Run workflow ↗</button><p>Conceptual demonstration of the workflow, not a live connection to the product.</p></div>` : ''}${project.steps.length ? `<h3>The outcome</h3><p>${project.outcome}</p>` : ''}<p class="story-note">${project.sourceNote || 'Project details reflect my resume and supplied project information. Illustrations and this interactive demonstration are created for this portfolio.'}</p></div>`;
        dialog.showModal();
        dialog.scrollTop = 0;
        document.body.classList.add('dialog-open');
    });
    if (!reducedMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
        card.addEventListener('pointermove', event => {
            const box = card.getBoundingClientRect();
            const x = (event.clientX - box.left) / box.width - .5;
            const y = (event.clientY - box.top) / box.height - .5;
            card.style.transform = `translateY(-18px) rotateX(${-y * 10}deg) rotateY(${x * 12}deg) rotate(${x * 3}deg)`;
        });
        card.addEventListener('pointerleave', () => card.style.removeProperty('transform'));
    }
});
dialog.addEventListener('click', event => {
    if (!event.target.closest('.demo-next')) return;
    demoIndex = (demoIndex + 1) % currentProject.steps.length;
    dialog.querySelectorAll('.demo-step').forEach((step, index) => step.classList.toggle('done', index <= demoIndex));
    dialog.querySelector('.demo-status').textContent = currentProject.statuses[demoIndex];
    dialog.querySelector('.demo-next').textContent = demoIndex === currentProject.steps.length - 1 ? 'Restart workflow ↻' : 'Next step →';
});

// Paper notes support both pointer dragging and keyboard movement.
document.querySelectorAll('.origin-note, .board-piece').forEach(note => {
    let x = 0, y = 0, drag;
    function move(nextX, nextY) {
        x = Math.max(-70, Math.min(70, nextX));
        y = Math.max(-65, Math.min(65, nextY));
        note.style.setProperty('--note-x', `${x}px`);
        note.style.setProperty('--note-y', `${y}px`);
    }
    note.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        drag = { pointer: event.pointerId, startX: event.clientX, startY: event.clientY, x, y };
        note.setPointerCapture(event.pointerId);
        note.classList.add('dragging');
        note.focus({ preventScroll: true });
        clickSound('open');
    });
    note.addEventListener('pointermove', event => {
        if (!drag || event.pointerId !== drag.pointer) return;
        move(drag.x + event.clientX - drag.startX, drag.y + event.clientY - drag.startY);
    });
    function release() { drag = null; note.classList.remove('dragging'); }
    note.addEventListener('pointerup', release);
    note.addEventListener('pointercancel', release);
    note.addEventListener('lostpointercapture', release);
    note.addEventListener('keydown', event => {
        const directions = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
        const direction = directions[event.key];
        if (!direction) return;
        event.preventDefault();
        event.stopPropagation();
        move(x + direction[0], y + direction[1]);
    });
});

// Pin the bottom of a tall hero so every part remains reachable before
// the following story section slides over it, including on small screens.
const heroSection = document.querySelector('.hero');
function sizeHeroPin() {
    const top = Math.min(0, window.innerHeight - heroSection.offsetHeight);
    heroSection.style.setProperty('--hero-pin-top', `${top}px`);
}
sizeHeroPin();
window.addEventListener('resize', sizeHeroPin);
if ('ResizeObserver' in window) new ResizeObserver(sizeHeroPin).observe(heroSection);
document.fonts?.ready.then(sizeHeroPin);

// Words brighten with reading progress; marker strokes follow their phrases.
if (!reducedMotion) {
    const originCopy = document.querySelector('.origin-copy');
    const paragraphs = [...originCopy.querySelectorAll(':scope > p')];
    paragraphs.forEach(paragraph => {
        const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) {
            if (!walker.currentNode.parentElement.closest('.story-star')) nodes.push(walker.currentNode);
        }
        nodes.forEach(node => {
            const fragment = document.createDocumentFragment();
            // Keep each phrase intact for live language switching.
            [node.textContent].forEach(part => {
                if (!part) return;
                if (/^\s+$/.test(part)) fragment.append(document.createTextNode(part));
                else {
                    const word = document.createElement('span');
                    word.className = 'reading-word';
                    word.textContent = part;
                    fragment.append(word);
                }
            });
            node.replaceWith(fragment);
        });
    });
    const words = [...originCopy.querySelectorAll('.reading-word')];
    const accents = [...originCopy.querySelectorAll('.marker, .scribble-circle')];
    let readingFrame;
    function paintReadingProgress() {
        readingFrame = null;
        const start = innerHeight * .88;
        const finish = innerHeight * .43;
        words.forEach(word => {
            const top = word.getBoundingClientRect().top;
            const progress = Math.max(0, Math.min(1, (start - top) / (start - finish)));
            word.style.setProperty('--word-light', (.17 + progress * .83).toFixed(3));
        });
        accents.forEach(accent => {
            const top = accent.getBoundingClientRect().top;
            const progress = Math.max(0, Math.min(1, (innerHeight * .76 - top) / (innerHeight * .28)));
            accent.style.setProperty('--stroke-progress', progress.toFixed(3));
        });
    }
    function queueReadingProgress() {
        if (!readingFrame) readingFrame = requestAnimationFrame(paintReadingProgress);
    }
    originCopy.classList.add('reading-animated');
    window.addEventListener('scroll', queueReadingProgress, { passive: true });
    window.addEventListener('resize', queueReadingProgress);
    document.fonts?.ready.then(queueReadingProgress);
    paintReadingProgress();
}

const careerStops = [
    {city:'Karachi, Pakistan',company:'Microlinks Private Limited',monogram:'ML',color:'#74a9a0',date:'Jan 2019 – Aug 2022',role:'Full Stack Developer',intro:'Where I built my foundation in production software.',bullets:['Developed applications serving more than 1,000 users, from design through release and support.','Built secure REST APIs and transaction workflows. Improved performance by 25% through database optimization and refactoring.'],tags:['REST APIs','Business applications','Database optimization']},
    {city:'Dubai, UAE',company:'Sterling Perfumes Industries LLC',monogram:'SP',color:'#d69c77',date:'Aug 2022 – Sep 2024',role:'Web Developer',intro:'A new city, e-commerce workflows, and a focus on performance.',bullets:['Reduced backend response times by 30% through SQL optimization and refactoring.','Developed WordPress and WooCommerce functionality, integrated third-party services, and automated reporting and business processes.'],tags:['WordPress / WooCommerce','Integrations','Automation']},
    {city:'Köln, Germany',company:'ProtocolHero GmbH',monogram:'PH',color:'#a89fc4',date:'Mar 2025 – Jun 2026',role:'Software Developer',intro:'End-to-end ownership of reliable backend systems and workflows.',bullets:['Owned backend services, REST APIs, data models, and integrations from requirements through deployment and production support.','Built background jobs and queues with retries and failure handling. Working student: Mar 2025–Mar 2026; full-time: Apr–Jun 2026.'],tags:['APIs & integrations','Async workflows','Production reliability']}
];
let careerIndex = -1;
const careerDetail = document.querySelector('#journey-detail');
function showCareerStop(index) {
    index = Math.max(0, Math.min(careerStops.length - 1, index));
    if (index === careerIndex) return;
    careerIndex = index;
    document.querySelector('.career-journey').dataset.city = String(index);
    const stop = careerStops[careerIndex];
    document.querySelectorAll('[data-stop]').forEach(button => {
        const active = Number(button.dataset.stop) === careerIndex;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
    document.querySelector('.journey-counter').textContent = `0${careerIndex + 1} / 03`;
    document.querySelector('.journey-prev').disabled = careerIndex === 0;
    document.querySelector('.journey-next').disabled = careerIndex === careerStops.length - 1;
    careerDetail.style.setProperty('--stop-color', stop.color);
    careerDetail.innerHTML = `<div class="journey-detail-top"><span class="company-monogram">${stop.monogram}</span><div><strong>${stop.company}</strong><p>${stop.city}</p></div><span>${stop.date}</span></div><h3>${stop.role}</h3><p>${stop.intro}</p><ul>${stop.bullets.map(item => `<li>${item}</li>`).join('')}</ul><div class="small-tags">${stop.tags.map(tag => `<span>${tag}</span>`).join('')}</div>`;
    careerDetail.classList.remove('changing');
    requestAnimationFrame(() => careerDetail.classList.add('changing'));
}
document.querySelectorAll('[data-stop]').forEach(button => button.addEventListener('click', () => goToCareerStop(Number(button.dataset.stop))));
document.querySelector('.journey-prev').addEventListener('click', () => goToCareerStop(careerIndex - 1));
document.querySelector('.journey-next').addEventListener('click', () => goToCareerStop(careerIndex + 1));
showCareerStop(0);


const careerSection = document.querySelector('.career-journey');
function scrollCareerEnabled() {
    return !reducedMotion && matchMedia('(min-width: 901px) and (min-height: 650px)').matches;
}
function goToCareerStop(index) {
    index = Math.max(0, Math.min(careerStops.length - 1, index));
    if (!scrollCareerEnabled()) { showCareerStop(index); return; }
    const top = careerSection.getBoundingClientRect().top + scrollY;
    const distance = careerSection.offsetHeight - innerHeight;
    window.scrollTo({ top: top + distance * ((index + .3) / 3), behavior: 'smooth' });
}
let careerScrollFrame;
function updateCareerScroll() {
    careerScrollFrame = null;
    if (!scrollCareerEnabled()) return;
    const rect = careerSection.getBoundingClientRect();
    if (rect.top > innerHeight || rect.bottom < 0) return;
    const distance = careerSection.offsetHeight - innerHeight;
    const progress = Math.max(0, Math.min(1, -rect.top / distance));
    showCareerStop(Math.min(2, Math.floor(progress * 3)));
    careerSection.style.setProperty('--career-progress', progress);
}
function queueCareerScroll() {
    if (!careerScrollFrame) careerScrollFrame = requestAnimationFrame(updateCareerScroll);
}
window.addEventListener('scroll', queueCareerScroll, { passive: true });
window.addEventListener('resize', queueCareerScroll);
queueCareerScroll();

const stackItems = [
    ['Node.js','JS','#448543','Backend services, APIs, and integrations.'],
    ['TypeScript','TS','#3178c6','Typed application code across backend and frontend.'],
    ['PHP','php','#777bb3','Server-side applications and business workflows.'],
    ['Laravel','L','#d94c42','Backend services, REST APIs, queues, and scheduled jobs.'],
    ['React','⚛','#20516a','Interactive frontend applications and reusable interfaces.'],
    ['PostgreSQL','PG','#336791','Relational data models, transactions, and query optimization.'],
    ['MySQL','My','#376c83','Database-driven applications and SQL performance work.'],
    ['Redis','R','#b94237','Caching and asynchronous backend workflows.'],
    ['RabbitMQ','RM','#d97025','Messaging and event-driven workflows.'],
    ['Docker','D','#287ab8','Consistent development and deployment environments.'],
    ['AWS','aws','#37465b','Cloud infrastructure and application delivery.'],
    ['GitLab CI/CD','CI','#b95e30','Version control and automated delivery pipelines.'],
    ['Tailwind CSS','≈','#167e92','Responsive interfaces and utility-based styling.'],
    ['Claude Code','✳','#a66b54','AI-assisted planning, implementation, and code review.'],
    ['Cursor','↗','#333b43','AI-assisted editing, refactoring, and debugging.'],
    ['Codex','⌘','#3b7165','AI-assisted implementation, testing, and review.'],
    ['GitHub Copilot','GH','#655a8a','Coding assistance with critical review of generated output.'],
    ['Linux','>_','#5b6266','Application environments and production troubleshooting.']
];
const stackIconFiles = ['nodejs','typescript','php','laravel','react','postgresql','mysql','redis','rabbitmq','docker','aws','gitlab','tailwindcss','claude','cursor','openai','githubcopilot','linux'];
const stackGrid = document.querySelector('#stack-tools');
const stackStage = document.querySelector('.gift-stage');
const unwrapButton = document.querySelector('.unwrap-stack');
const toolDescription = document.querySelector('.tool-description');
stackItems.forEach(([name, icon, color, description], index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'stack-tool';
    button.style.setProperty('--tool-index', index);
    button.style.setProperty('--tool-color', color);
    button.setAttribute('aria-label', `${name}: ${description}`);
    const tile = document.createElement('span'); tile.className = 'tool-icon'; tile.setAttribute('aria-hidden','true');
    const logo = document.createElement('img');
    logo.src = `assets/tech-icons/${stackIconFiles[index]}.svg`;
    logo.alt = ''; logo.width = 32; logo.height = 32;
    tile.append(logo);
    const label = document.createElement('span'); label.textContent = name;
    button.append(tile, label);
    function describeTool() {
        stackGrid.querySelectorAll('.stack-tool').forEach(tool => tool.classList.toggle('selected',tool === button));
        toolDescription.querySelector('span').textContent = name;
        toolDescription.querySelector('p').textContent = description;
    }
    button.addEventListener('pointerenter', describeTool);
    button.addEventListener('focus', describeTool);
    button.addEventListener('click', describeTool);
    stackGrid.append(button);
});
unwrapButton.addEventListener('click', () => {
    const opened = unwrapButton.getAttribute('aria-expanded') !== 'true';
    unwrapButton.setAttribute('aria-expanded', String(opened));
    stackStage.classList.toggle('unwrapped', opened);
    stackGrid.hidden = !opened;
    unwrapButton.querySelector('.unwrap-label').textContent = opened ? 'Wrap it back up' : 'Unwrap my stack';
    toolDescription.querySelector('span').textContent = opened ? 'MY TOOLKIT' : 'BUILT WITH PURPOSE';
    toolDescription.querySelector('p').textContent = opened ? 'Hover, focus, or tap a tool to see how I use it.' : 'Open the box to explore my toolkit.';
});

// The pinned hero only participates in the first section transition.
const aboutSection = document.querySelector('#about');
let heroCoverFrame;
function updateHeroCover() {
    heroCoverFrame = null;
    const covered = aboutSection.getBoundingClientRect().top <= 0;
    heroSection.classList.toggle('hero-covered', covered);
}
function queueHeroCover() {
    if (!heroCoverFrame) heroCoverFrame = requestAnimationFrame(updateHeroCover);
}
window.addEventListener('scroll', queueHeroCover, { passive: true });
window.addEventListener('resize', queueHeroCover);
updateHeroCover();

const copyEmailButton = document.querySelector('.copy-contact-email');
copyEmailButton.addEventListener('click', async () => {
    const status = document.querySelector('.copy-email-status');
    try {
        await navigator.clipboard.writeText('muneebmansoor98@gmail.com');
        status.textContent = 'Email copied';
    } catch {
        status.textContent = 'Select the email address to copy it.';
    }
});
