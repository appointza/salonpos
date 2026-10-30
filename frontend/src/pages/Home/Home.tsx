import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { BRAND_LOGO } from "@/brand";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import "./marketing.css";

const DEMO_MAIL = "mailto:hello@kriosapp.com?subject=Book%20a%20Kriosapp%20demo";
const YEAR = new Date().getFullYear();

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://kriosapp.com/#org",
      name: "Kriosapp",
      url: "https://kriosapp.com/",
      logo: "https://kriosapp.com/krios-logo.png",
      sameAs: [
        "https://www.instagram.com/kriosapp",
        "https://www.facebook.com/kriosapp",
        "https://www.youtube.com/@kriosapp",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://kriosapp.com/#website",
      url: "https://kriosapp.com/",
      name: "Kriosapp",
      publisher: { "@id": "https://kriosapp.com/#org" },
      inLanguage: "en-IN",
    },
    {
      "@type": "SoftwareApplication",
      name: "Kriosapp — Krios Desk & Krios Points",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Salon and spa management software",
      operatingSystem: "Web, Android, iOS",
      url: "https://kriosapp.com/",
      publisher: { "@id": "https://kriosapp.com/#org" },
      description:
        "All-in-one salon and spa management software with appointment booking, CRM, POS, inventory, staff and attendance management, WhatsApp marketing, memberships and a customer loyalty program.",
      featureList: [
        "Salon CRM",
        "Online appointment booking",
        "Inventory management",
        "Staff and commission management",
        "Attendance management",
        "WhatsApp marketing campaigns",
        "Subscriptions and memberships",
        "Business reports",
        "Loyalty points",
        "Spin wheel rewards",
        "Scratch card rewards",
        "Coupons and promotional offers",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is salon management software?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Salon management software is a single system that helps salons and spas run day-to-day operations — appointments, customer records, billing, staff, inventory and marketing — instead of using notebooks, spreadsheets and separate apps.",
          },
        },
        {
          "@type": "Question",
          name: "What is Krios Desk?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Krios Desk is Kriosapp's salon POS, CRM and business management software. It covers appointment booking, customer profiles and service history, inventory, staff, attendance, subscriptions, WhatsApp campaigns and business reports.",
          },
        },
        {
          "@type": "Question",
          name: "What is Krios Points?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Krios Points is Kriosapp's customer loyalty and retention software for salons and spas. It lets you run loyalty points, spin wheel and scratch card rewards, and coupons that give customers a reason to come back.",
          },
        },
        {
          "@type": "Question",
          name: "How can a salon increase customer retention?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Know your customers' history and preferences, remind them when it is time to book again, and reward repeat visits. Krios Desk keeps the customer history and sends reminders and campaigns, while Krios Points rewards customers with points, coupons and interactive rewards.",
          },
        },
        {
          "@type": "Question",
          name: "Can Kriosapp help with salon marketing?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. You can send WhatsApp campaigns for offers, new services and festive promotions, re-engage inactive customers, and create coupons and reward campaigns using your customer data.",
          },
        },
        {
          "@type": "Question",
          name: "Can Kriosapp help manage salon employees?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Krios Desk manages staff profiles, roles, schedules and shifts, commissions, performance, attendance, late check-ins and leave.",
          },
        },
      ],
    },
  ],
};

const SOCIAL = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/kriosapp",
    path: "M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm5 5a5 5 0 100 10 5 5 0 000-10zm6.5-.9a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z",
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/kriosapp",
    path: "M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6L16 12h-3V10c0-.6.4-1 1-1z",
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@kriosapp",
    path: "M23 12s0-3.2-.4-4.7c-.2-.8-.9-1.5-1.7-1.7C19.2 5 12 5 12 5s-7.2 0-8.9.6c-.8.2-1.5.9-1.7 1.7C1 8.8 1 12 1 12s0 3.2.4 4.7c.2.8.9 1.5 1.7 1.7C4.8 19 12 19 12 19s7.2 0 8.9-.6c.8-.2 1.5-.9 1.7-1.7.4-1.5.4-4.7.4-4.7zM10 15.5v-7l6 3.5-6 3.5z",
  },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Kriosapp home">
      <span className="logo-mark" aria-hidden="true">
        <img src={BRAND_LOGO} alt="" />
      </span>
      <span>
        Kriosapp
        <small>SALON &amp; SPA</small>
      </span>
    </Link>
  );
}

export function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll(".krios-mkt .reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="krios-mkt">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <a className="skip" href="#main">
        Skip to content
      </a>

      <header className={`header${scrolled ? " scrolled" : ""}`} id="top">
        <nav className="wrap nav" aria-label="Main">
          <Logo />
          <div className={`menu${menuOpen ? " open" : ""}`} id="menu">
            <a href="#krios-desk" onClick={() => setMenuOpen(false)}>
              Krios Desk
            </a>
            <a href="#krios-points" onClick={() => setMenuOpen(false)}>
              Krios Points
            </a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
              How it works
            </a>
            <a href="#why-kriosapp" onClick={() => setMenuOpen(false)}>
              Why Kriosapp
            </a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>
              FAQ
            </a>
          </div>
          <div className="nav-cta">
            <Link to="/login" className="login">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary">
              Get Started
            </Link>
            <button
              type="button"
              className="burger"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </nav>
      </header>

      <main id="main">
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <span className="eyebrow">Salon &amp; Spa Management Software</span>
              <h1>
                Run your salon. Reward your clients. <em>Grow every visit.</em>
              </h1>
              <p className="lead">
                Kriosapp is all-in-one salon and spa software — appointment booking, CRM, POS, staff, inventory and
                WhatsApp marketing in <strong>Krios Desk</strong>, plus a built-in loyalty program with points, spin
                wheels and coupons in <strong>Krios Points</strong>.
              </p>
              <div className="hero-ctas">
                <Link to="/register" className="btn btn-primary">
                  Get Started Free
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <a href="#demo" className="btn btn-ghost">
                  Book a Demo
                </a>
              </div>
              <ul className="chips">
                <li>
                  <CheckIcon />
                  WhatsApp campaigns built in
                </li>
                <li>
                  <CheckIcon />
                  Loyalty &amp; rewards included
                </li>
                <li>
                  <CheckIcon />
                  Made for salons &amp; spas in India
                </li>
              </ul>
            </div>

            <div className="mock" aria-hidden="true">
              <div className="screen">
                <div className="screen-top">
                  <b>Today&apos;s appointments</b>
                  <div className="dots">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
                <div className="kpis">
                  <div className="kpi">
                    <span>Bookings</span>
                    <strong>24</strong>
                  </div>
                  <div className="kpi">
                    <span>Returning</span>
                    <strong>68%</strong>
                  </div>
                  <div className="kpi">
                    <span>Rewards</span>
                    <strong>15</strong>
                  </div>
                </div>
                <div className="appt">
                  <span className="av" style={{ background: "#e2725b" }}>
                    PR
                  </span>
                  <div>
                    <b>Priya R.</b>
                    <br />
                    <small>Hair spa · Anitha</small>
                  </div>
                  <span className="tag" style={{ background: "#fbe6df", color: "#c95a44" }}>
                    Gold member
                  </span>
                  <span className="t">10:30</span>
                </div>
                <div className="appt">
                  <span className="av" style={{ background: "#6b3a7d" }}>
                    KS
                  </span>
                  <div>
                    <b>Karthik S.</b>
                    <br />
                    <small>Haircut &amp; beard · Ravi</small>
                  </div>
                  <span className="tag" style={{ background: "#e3f4ee", color: "#2d7d66" }}>
                    Checked in
                  </span>
                  <span className="t">11:00</span>
                </div>
                <div className="appt">
                  <span className="av" style={{ background: "#e8b86b" }}>
                    MD
                  </span>
                  <div>
                    <b>Meena D.</b>
                    <br />
                    <small>Bridal trial · Lakshmi</small>
                  </div>
                  <span className="tag" style={{ background: "#f3ece3", color: "#3d1f4a" }}>
                    Reminder sent
                  </span>
                  <span className="t">12:15</span>
                </div>
                <div className="appt">
                  <span className="av" style={{ background: "#3fa98a" }}>
                    AJ
                  </span>
                  <div>
                    <b>Arun J.</b>
                    <br />
                    <small>Facial · Divya</small>
                  </div>
                  <span className="tag" style={{ background: "#fbe6df", color: "#c95a44" }}>
                    Coupon
                  </span>
                  <span className="t">13:00</span>
                </div>
              </div>
              <div className="float float-points">
                <span className="ic">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3 6.5 7 .9-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.9z" />
                  </svg>
                </span>
                <div>
                  <b>+120 points</b>
                  <br />
                  <small>Priya earned on her visit</small>
                </div>
              </div>
              <div className="float float-wheel">
                <div className="mini-wheel" />
                <div>
                  <b>Spin &amp; win</b>
                  <br />
                  <small>20% off next facial</small>
                </div>
              </div>
              <div className="float float-wa">
                <span className="ic">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2z" />
                  </svg>
                </span>
                <div>
                  <b>Diwali offer sent</b>
                  <br />
                  <small>to 320 clients</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 24 }} aria-labelledby="platform">
          <div className="wrap">
            <div className="section-head center">
              <span className="eyebrow">One platform · Two products</span>
              <h2 id="platform">All-in-one software for salons &amp; spas</h2>
              <p className="lead">
                Running a salon is more than great service. Kriosapp brings appointments, customers, staff, inventory,
                marketing, memberships and customer retention into one connected system — for beauty salons, hair
                salons, unisex salons, spas and wellness centres.
              </p>
            </div>
            <div className="products">
              <article className="product p-desk reveal">
                <span className="badge">Krios Desk</span>
                <h3>Salon POS, CRM &amp; management</h3>
                <p>Everything you need to run the day — from the first booking to the end-of-day report.</p>
                <ul>
                  <li>Appointment booking</li>
                  <li>Customer CRM</li>
                  <li>Inventory</li>
                  <li>Staff &amp; commissions</li>
                  <li>Attendance</li>
                  <li>Memberships</li>
                  <li>WhatsApp marketing</li>
                  <li>Business reports</li>
                </ul>
                <a href="#krios-desk" className="link" style={{ color: "var(--rose-600)" }}>
                  Explore Krios Desk →
                </a>
              </article>
              <article className="product p-points reveal">
                <span className="badge">Krios Points</span>
                <h3>Loyalty that brings clients back</h3>
                <p>Turn one-time visitors into regulars with rewards customers actually enjoy.</p>
                <ul>
                  <li>Loyalty points</li>
                  <li>Spin wheel rewards</li>
                  <li>Scratch cards</li>
                  <li>Coupons &amp; offers</li>
                  <li>Birthday rewards</li>
                  <li>Win-back campaigns</li>
                </ul>
                <a href="#krios-points" className="link" style={{ color: "var(--gold)" }}>
                  Explore Krios Points →
                </a>
              </article>
            </div>
            <p className="together">
              Use them together to manage operations, engage customers, encourage repeat visits and grow revenue.
            </p>
          </div>
        </section>

        <section className="section bg-white" id="krios-desk" aria-labelledby="desk-h">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Krios Desk</span>
              <h2 id="desk-h">Salon management software built for how you work</h2>
              <p className="lead">
                Krios Desk gives salon owners and managers full visibility and control — scheduling, customers, stock,
                staff and marketing in one place.
              </p>
            </div>
            <div className="features">
              <Feature
                title="Salon CRM"
                lead="Know every client, their history and preferences."
                points={["Customer profiles", "Service history", "Preferences & notes", "Personalised service"]}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="8" r="4" />
                    <path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 11a3 3 0 100-6M22 21c0-3-1.5-5-4-5.6" />
                  </svg>
                }
              />
              <Feature
                title="Online Appointment Booking"
                lead="Fewer clashes, fewer no-shows, less phone time."
                points={["Schedules & availability", "Automatic reminders", "Staff availability", "Reduce missed bookings"]}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M3 10h18M8 3v4M16 3v4M8 15h3" />
                  </svg>
                }
              />
              <Feature
                title="Inventory Management"
                lead="Know what you have, what you need and when."
                points={["Stock tracking", "Low-stock alerts", "Product usage", "Smarter purchasing"]}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
                  </svg>
                }
              />
              <Feature
                title="Staff Management"
                lead="Give your team the tools to work efficiently."
                points={["Roles & profiles", "Shifts & schedules", "Commission tracking", "Performance"]}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="7" width="18" height="13" rx="2" />
                    <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18" />
                  </svg>
                }
              />
              <Feature
                title="WhatsApp Marketing"
                lead="Reach clients where they already spend time."
                points={["Offers & new services", "Festive campaigns", "Re-engage inactive clients", "Rebooking nudges"]}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 01-13.3 7.9L3 21l1.1-4.7A9 9 0 1121 12z" />
                    <path d="M8.5 10.5c.5 2 2 3.5 4 4l1.2-1.2 2 .8v1.6c-4 .5-8-3.5-7.5-7.5h1.6l.8 2z" />
                  </svg>
                }
              />
              <Feature
                title="Attendance Management"
                lead="Full visibility of your workforce."
                points={["Check-ins & hours", "Late arrivals", "Shift tracking", "Leave management"]}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                }
              />
              <Feature
                title="Memberships & Subscriptions"
                lead="Turn one-time clients into long-term members."
                points={["Subscription plans", "Membership tracking", "Renewal reminders", "Recurring revenue"]}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20M6 15h4" />
                  </svg>
                }
              />
              <Feature
                title="Reports & Insights"
                lead="Turn salon data into better decisions."
                points={["Revenue & services", "Staff performance", "Customer trends", "What's working"]}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3v18h18" />
                    <path d="M7 15l4-4 3 3 5-6" />
                  </svg>
                }
              />
            </div>
          </div>
        </section>

        <section className="section dark" id="krios-points" aria-labelledby="points-h">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Krios Points</span>
              <h2 id="points-h">Salon loyalty program software that brings customers back</h2>
              <p className="lead">
                Getting a client through the door is only the beginning. Krios Points gives them more reasons to return
                — with loyalty points, coupons, spin wheels and scratch cards.{" "}
                <strong style={{ color: "#fff" }}>Reward. Engage. Retain.</strong>
              </p>
            </div>
            <div className="reward-grid">
              <article className="reward reward-hero reveal">
                <div className="wheel-wrap" aria-hidden="true">
                  <div className="wheel" />
                </div>
                <h3>Spin wheel &amp; scratch card rewards</h3>
                <p>
                  Go beyond a plain discount. Interactive rewards turn an ordinary visit into a memorable moment clients
                  talk about.
                </p>
                <p className="use">Use rewards to</p>
                <ul className="pills">
                  <li>Boost engagement</li>
                  <li>Promote selected services</li>
                  <li>Reward instantly</li>
                  <li>Run exciting campaigns</li>
                </ul>
              </article>
              <article className="reward reveal">
                <div className="icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9V6a1 1 0 011-1h16a1 1 0 011 1v3a3 3 0 000 6v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3a3 3 0 000-6z" />
                    <path d="M14 5v14" strokeDasharray="2 3" />
                  </svg>
                </div>
                <h3>Coupons &amp; offers</h3>
                <p>Give clients a reason to book their next appointment.</p>
                <p className="use">Use coupons for</p>
                <ul className="pills">
                  <li>First-time clients</li>
                  <li>Repeat visits</li>
                  <li>Birthdays</li>
                  <li>Festivals</li>
                  <li>Seasonal deals</li>
                  <li>Win-backs</li>
                </ul>
              </article>
              <article className="reward reveal">
                <div className="icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3 6.5 7 .9-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.9z" />
                  </svg>
                </div>
                <h3>Loyalty points</h3>
                <p>A structured program where clients earn points and redeem them for services, products or rewards.</p>
                <p className="use">Helps you</p>
                <ul className="pills">
                  <li>Reward regulars</li>
                  <li>Increase retention</li>
                  <li>Encourage add-ons</li>
                  <li>Build relationships</li>
                </ul>
              </article>
            </div>

            <h3 style={{ marginTop: 72, fontSize: "1.7rem", color: "#fff" }}>How Krios Points helps your salon grow</h3>
            <div className="benefits" style={{ marginTop: 24 }}>
              <div className="benefit">
                <span className="num">01</span>
                <h3>Higher retention</h3>
                <p>Keep the clients you have instead of constantly paying to find new ones.</p>
              </div>
              <div className="benefit">
                <span className="num">02</span>
                <h3>More repeat visits</h3>
                <p>Rewards, coupons and points nudge clients to book again.</p>
              </div>
              <div className="benefit">
                <span className="num">03</span>
                <h3>Better engagement</h3>
                <p>Spin wheels and scratch cards make promotions fun.</p>
              </div>
              <div className="benefit">
                <span className="num">04</span>
                <h3>Higher lifetime value</h3>
                <p>Clients visit more often and try more services.</p>
              </div>
              <div className="benefit">
                <span className="num">05</span>
                <h3>Win back inactive clients</h3>
                <p>Targeted offers bring lapsed customers back in.</p>
              </div>
              <div className="benefit">
                <span className="num">06</span>
                <h3>Stronger brand loyalty</h3>
                <p>Make your regulars feel valued and recognised.</p>
              </div>
              <div className="benefit">
                <span className="num">07</span>
                <h3>Personalised promotions</h3>
                <p>Use client data to send offers that feel relevant.</p>
              </div>
              <div className="benefit">
                <span className="num">08</span>
                <h3>Revenue through loyalty</h3>
                <p>More returning clients means more recurring revenue.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="how-it-works" aria-labelledby="how-h">
          <div className="wrap">
            <div className="section-head center">
              <span className="eyebrow">Krios Desk + Krios Points</span>
              <h2 id="how-h">The complete salon management &amp; loyalty solution</h2>
              <p className="lead">
                Why juggle separate systems? Connect daily operations with customer loyalty — so every appointment
                becomes a chance to bring that client back.
              </p>
            </div>
            <div className="combo reveal">
              <div className="combo-card">
                <h3>Krios Desk manages your business</h3>
                <ul className="pills">
                  <li>Appointments</li>
                  <li>CRM</li>
                  <li>Inventory</li>
                  <li>Staff</li>
                  <li>Attendance</li>
                  <li>Subscriptions</li>
                  <li>Marketing</li>
                  <li>Reports</li>
                </ul>
              </div>
              <div className="combo-plus" aria-hidden="true">
                +
              </div>
              <div className="combo-card">
                <h3>Krios Points grows your relationships</h3>
                <ul className="pills">
                  <li>Loyalty points</li>
                  <li>Spin wheel</li>
                  <li>Scratch cards</li>
                  <li>Coupons</li>
                  <li>Rewards</li>
                  <li>Engagement</li>
                  <li>Repeat visits</li>
                  <li>Retention</li>
                </ul>
              </div>
            </div>

            <h3 className="center" style={{ textAlign: "center", fontSize: "1.7rem", margin: "88px 0 40px" }}>
              From appointment to loyalty
            </h3>
            <ol className="journey">
              <li className="step reveal">
                <span className="n">1</span>
                <span className="who who-d">Desk</span>
                <h3>Client books</h3>
                <p>Appointment managed in Krios Desk.</p>
              </li>
              <li className="step reveal">
                <span className="n">2</span>
                <span className="who who-d">Desk</span>
                <h3>Client visits</h3>
                <p>Profile &amp; service history at hand.</p>
              </li>
              <li className="step reveal">
                <span className="n">3</span>
                <span className="who who-d">Desk</span>
                <h3>Service delivered</h3>
                <p>A personalised salon experience.</p>
              </li>
              <li className="step reveal">
                <span className="n">4</span>
                <span className="who who-p">Points</span>
                <h3>Earns rewards</h3>
                <p>Points or a spin for their visit.</p>
              </li>
              <li className="step reveal">
                <span className="n">5</span>
                <span className="who who-p">Points</span>
                <h3>Gets an offer</h3>
                <p>A relevant coupon or campaign.</p>
              </li>
              <li className="step reveal">
                <span className="n">6</span>
                <span className="who who-p">Points</span>
                <h3>Client returns</h3>
                <p>A reason to book the next visit.</p>
              </li>
              <li className="step reveal">
                <span className="n">7</span>
                <span className="who who-d">Growth</span>
                <h3>Business grows</h3>
                <p>A loyal base of repeat clients.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="section bg-white" id="why-kriosapp" aria-labelledby="why-h">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Why choose Kriosapp</span>
              <h2 id="why-h">Everything you need to run a modern salon</h2>
            </div>
            <div className="why">
              <Why
                title="Save time"
                text="Simplify everyday salon operations."
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                }
              />
              <Why
                title="Work efficiently"
                text="Appointments, clients, staff and stock in one place."
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
                  </svg>
                }
              />
              <Why
                title="Better client experience"
                text="Understand clients and personalise every visit."
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 000-7.8z" />
                  </svg>
                }
              />
              <Why
                title="More repeat visits"
                text="Rewards and loyalty bring clients back."
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 4v6h6M23 20v-6h-6" />
                    <path d="M20.5 9A9 9 0 005.6 5.6L1 10m22 4l-4.6 4.4A9 9 0 013.5 15" />
                  </svg>
                }
              />
              <Why
                title="Higher retention"
                text="Stronger relationships with existing clients."
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="8" r="4" />
                    <path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 3.5a4 4 0 010 9" />
                  </svg>
                }
              />
              <Why
                title="Grow revenue"
                text="Through promotions, memberships and loyalty."
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
                  </svg>
                }
              />
            </div>
            <div className="ideal reveal">
              <h3>Built for salons &amp; spas</h3>
              <ul>
                <li>Beauty salons</li>
                <li>Hair salons</li>
                <li>Unisex salons</li>
                <li>Spas</li>
                <li>Beauty &amp; wellness centres</li>
                <li>Premium salons</li>
                <li>Multi-service salons</li>
                <li>Growing salon chains</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section" id="faq" aria-labelledby="faq-h">
          <div className="wrap faq-grid">
            <div>
              <span className="eyebrow">FAQ</span>
              <h2 id="faq-h" style={{ margin: "14px 0" }}>
                Frequently asked questions
              </h2>
              <p className="lead">Still have questions? Our team is happy to walk you through Kriosapp.</p>
              <a href="#demo" className="btn btn-ghost" style={{ marginTop: 24 }}>
                Talk to our team
              </a>
            </div>
            <div className="faq">
              <details open>
                <summary>What is salon management software?</summary>
                <p>
                  Salon management software is a single system that helps salons and spas run day-to-day operations —
                  appointments, customer records, billing, staff, inventory and marketing — instead of using notebooks,
                  spreadsheets and separate apps.
                </p>
              </details>
              <details>
                <summary>What is Krios Desk?</summary>
                <p>
                  Krios Desk is Kriosapp&apos;s salon POS, CRM and business management software. It covers appointment
                  booking, customer profiles and service history, inventory, staff, attendance, subscriptions, WhatsApp
                  campaigns and business reports.
                </p>
              </details>
              <details>
                <summary>What is Krios Points?</summary>
                <p>
                  Krios Points is Kriosapp&apos;s customer loyalty and retention software for salons and spas. It lets
                  you run loyalty points, spin wheel and scratch card rewards, and coupons that give customers a reason
                  to come back.
                </p>
              </details>
              <details>
                <summary>How can a salon increase customer retention?</summary>
                <p>
                  Know your customers&apos; history and preferences, remind them when it is time to book again, and
                  reward repeat visits. Krios Desk keeps the customer history and sends reminders and campaigns, while
                  Krios Points rewards customers with points, coupons and interactive rewards.
                </p>
              </details>
              <details>
                <summary>Can Kriosapp help with salon marketing?</summary>
                <p>
                  Yes. You can send WhatsApp campaigns for offers, new services and festive promotions, re-engage
                  inactive customers, and create coupons and reward campaigns using your customer data.
                </p>
              </details>
              <details>
                <summary>Can Kriosapp help manage salon employees?</summary>
                <p>
                  Yes. Krios Desk manages staff profiles, roles, schedules and shifts, commissions, performance,
                  attendance, late check-ins and leave.
                </p>
              </details>
            </div>
          </div>
        </section>

        <section className="cta" id="demo" aria-labelledby="cta-h">
          <div className="wrap">
            <div className="cta-box">
              <span className="eyebrow">Ready to transform your salon?</span>
              <h2 id="cta-h">Manage smarter. Engage better. Grow faster.</h2>
              <p>
                Start with Krios Desk to manage your salon, and grow with Krios Points to reward your customers — all in
                one connected platform.
              </p>
              <div className="hero-ctas">
                <Link to="/register" className="btn btn-light">
                  Get Started
                </Link>
                <a href={DEMO_MAIL} className="btn btn-outline-light">
                  Book a Demo
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <Logo />
              <p style={{ marginTop: 14, maxWidth: 300 }}>
                Salon &amp; spa management software with built-in CRM, WhatsApp marketing and customer loyalty.
              </p>
              <div className="social">
                {SOCIAL.map((item) => (
                  <a key={item.name} href={item.href} target="_blank" rel="noreferrer" aria-label={item.name}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d={item.path} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4>Products</h4>
              <ul>
                <li>
                  <a href="#krios-desk">Krios Desk</a>
                </li>
                <li>
                  <a href="#krios-points">Krios Points</a>
                </li>
                <li>
                  <a href="#how-it-works">How it works</a>
                </li>
              </ul>
            </div>
            <div>
              <h4>Features</h4>
              <ul>
                <li>
                  <a href="#krios-desk">Salon CRM</a>
                </li>
                <li>
                  <a href="#krios-desk">Appointment booking</a>
                </li>
                <li>
                  <a href="#krios-points">Loyalty program</a>
                </li>
                <li>
                  <a href="#krios-desk">WhatsApp marketing</a>
                </li>
              </ul>
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                <li>
                  <a href="#why-kriosapp">Why Kriosapp</a>
                </li>
                <li>
                  <a href="#faq">FAQ</a>
                </li>
                <li>
                  <a href={DEMO_MAIL}>Book a demo</a>
                </li>
                <li>
                  <Link to="/login">Login</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© {YEAR} Kriosapp. Salon &amp; spa management software.</span>
            <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <LanguageSwitcher compact />
              <Link to="/privacy">Privacy</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  title,
  lead,
  points,
  icon,
}: {
  title: string;
  lead: string;
  points: string[];
  icon: ReactNode;
}) {
  return (
    <article className="feature reveal">
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      <p>{lead}</p>
      <ul>
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </article>
  );
}

function Why({ title, text, icon }: { title: string; text: string; icon: ReactNode }) {
  return (
    <div className="why-item reveal">
      <div className="icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}
