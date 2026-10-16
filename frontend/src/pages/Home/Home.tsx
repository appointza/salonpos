import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardList,
  Gift,
  IdCard,
  LayoutDashboard,
  MessageCircle,
  Package,
  Repeat,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { BRAND_LOGO } from "@/brand";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

const DESK_FEATURES = [
  {
    icon: Users,
    title: "Customer Relationship Management (CRM)",
    lead: "Build stronger customer relationships with an integrated salon CRM.",
    points: [
      "Maintain customer profiles",
      "Track service history",
      "Store customer preferences",
      "Understand customer behavior",
      "Deliver more personalized services",
      "Keep customer information organized",
    ],
    closer: "Know your customers. Understand their preferences. Deliver better experiences.",
  },
  {
    icon: CalendarDays,
    title: "Online Appointment Booking",
    lead: "Make salon appointment scheduling easier for your customers and staff.",
    points: [
      "Manage appointments in one place",
      "View schedules and availability",
      "Reduce scheduling conflicts",
      "Send appointment reminders",
      "Manage staff availability",
      "Reduce missed appointments",
    ],
    closer: "Spend less time coordinating appointments and more time serving your customers.",
  },
  {
    icon: Package,
    title: "Salon Inventory Management",
    lead: "Take control of your salon's products and supplies with inventory management software.",
    points: [
      "Track product stock",
      "Monitor inventory levels",
      "Identify low-stock products",
      "Track product usage",
      "Reduce unnecessary purchases",
      "Improve inventory planning",
    ],
    closer: "Know what you have, what you need, and when you need it.",
  },
  {
    icon: IdCard,
    title: "Staff Management",
    lead: "Simplify salon staff management and improve team productivity.",
    points: [
      "Manage employee profiles",
      "Assign roles and responsibilities",
      "Track staff performance",
      "Manage schedules and shifts",
      "Track commissions",
      "Manage attendance and leave",
    ],
    closer: "Give your team the tools they need to work efficiently.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Marketing & Campaigns",
    lead: "Turn customer data into meaningful marketing opportunities. Use WhatsApp marketing for salons to communicate promotions, offers, service updates, and campaigns directly with customers.",
    points: [
      "Promote special offers",
      "Announce new services",
      "Run festive campaigns",
      "Re-engage inactive customers",
      "Share promotional messages",
      "Encourage customers to book again",
    ],
    closer: "Reach your customers where they already spend their time.",
  },
  {
    icon: ClipboardList,
    title: "Attendance Management",
    lead: "Simplify employee attendance and workforce management.",
    points: [
      "Track staff attendance",
      "Monitor working hours",
      "Manage shifts",
      "Track leave",
      "Monitor late check-ins",
      "Improve workforce visibility",
    ],
    closer: "",
  },
  {
    icon: Repeat,
    title: "Subscription & Membership Management",
    lead: "Create recurring revenue opportunities with salon subscriptions and memberships.",
    points: [
      "Create subscription plans",
      "Manage memberships",
      "Track renewals",
      "Manage customer subscriptions",
      "Encourage repeat visits",
      "Build predictable customer relationships",
    ],
    closer: "Turn one-time customers into long-term members.",
  },
  {
    icon: LayoutDashboard,
    title: "Business Reports & Insights",
    lead: "Get better visibility into your salon's performance. Track important business information to understand what is working, identify opportunities, and make smarter decisions.",
    points: [],
    closer: "Turn your salon data into actionable business insights.",
  },
];

const POINT_BLOCKS = [
  {
    title: "Spin Wheel & Scratch Card Rewards",
    lead: "Make customer rewards more exciting with interactive spin wheel and scratch card promotions. Instead of simply offering a discount, create a memorable customer experience.",
    intro: "Use rewards to:",
    points: [
      "Increase customer engagement",
      "Encourage repeat visits",
      "Promote selected services",
      "Create exciting campaigns",
      "Reward customers instantly",
      "Make promotions more interactive",
    ],
    closer: "Turn an ordinary salon visit into a rewarding experience.",
  },
  {
    title: "Coupons & Promotional Offers",
    lead: "Create salon coupons and promotional offers designed to encourage customers to return.",
    intro: "Use coupons for:",
    points: [
      "First-time customers",
      "Repeat visits",
      "Birthday offers",
      "Festival promotions",
      "Service promotions",
      "Seasonal campaigns",
      "Customer reactivation",
    ],
    closer: "Give customers a reason to book their next appointment.",
  },
  {
    title: "Loyalty Points",
    lead: "Build a structured salon loyalty program that rewards customers for their continued engagement. Customers can earn loyalty points based on your chosen program and redeem them for eligible services, products, or rewards.",
    intro: "Loyalty points can help you:",
    points: [
      "Encourage repeat visits",
      "Increase customer engagement",
      "Reward frequent customers",
      "Strengthen customer relationships",
      "Improve customer retention",
      "Encourage additional purchases",
    ],
    closer: "Reward loyalty. Build relationships. Grow repeat business.",
  },
];

const GROWTH = [
  { title: "Increase Customer Retention", text: "Give customers an incentive to return instead of constantly spending money to acquire new customers." },
  { title: "Increase Repeat Visits", text: "Use rewards, coupons, and loyalty points to encourage customers to book their next service." },
  { title: "Improve Customer Engagement", text: "Interactive rewards such as spin wheels and scratch cards make your promotions more engaging." },
  { title: "Increase Customer Lifetime Value", text: "Encourage customers to visit more frequently and explore additional services." },
  { title: "Re-Engage Inactive Customers", text: "Use targeted offers and campaigns to bring customers back to your salon." },
  { title: "Build Brand Loyalty", text: "Reward your regular customers and make them feel valued." },
  { title: "Create Personalized Promotions", text: "Use customer information to create more relevant offers and campaigns." },
  { title: "Grow Revenue Through Loyalty", text: "More returning customers can create more opportunities for recurring revenue and long-term business growth." },
];

const JOURNEY = [
  { n: "1", title: "Customer Books", text: "Manage customer appointments through Krios Desk." },
  { n: "2", title: "Customer Visits", text: "Access customer information and service history." },
  { n: "3", title: "Service Delivered", text: "Provide a personalized salon experience." },
  { n: "4", title: "Customer Earns Rewards", text: "Use Krios Points to reward customer engagement." },
  { n: "5", title: "Customer Receives an Offer", text: "Send relevant coupons, rewards, or promotional campaigns." },
  { n: "6", title: "Customer Returns", text: "Give customers a reason to book their next appointment." },
  { n: "7", title: "Your Business Grows", text: "Build a stronger base of repeat customers and loyal clients." },
];

const WHY = [
  { title: "Save Time", text: "Simplify everyday salon operations." },
  { title: "Improve Efficiency", text: "Bring appointments, customers, staff, inventory, and business management together." },
  { title: "Improve Customer Experience", text: "Understand your customers and deliver personalized service." },
  { title: "Increase Repeat Visits", text: "Use rewards and loyalty programs to encourage customers to return." },
  { title: "Improve Customer Retention", text: "Build stronger relationships with your existing customer base." },
  { title: "Grow Revenue", text: "Create more opportunities through repeat business, promotions, subscriptions, and customer loyalty." },
];

const IDEAL_FOR = [
  "Beauty Salons",
  "Hair Salons",
  "Unisex Salons",
  "Spas",
  "Beauty & Wellness Centers",
  "Premium Salons",
  "Multi-Service Salons",
  "Growing Salon Businesses",
];

const FAQ = [
  {
    q: "What is salon management software?",
    a: "Salon management software helps businesses manage essential operations such as appointments, customers, staff, inventory, subscriptions, marketing, and reporting from one platform.",
  },
  {
    q: "What is Krios Desk?",
    a: "Krios Desk is salon POS, CRM, and management software designed to help salons and spas manage appointments, customers, inventory, staff, attendance, marketing, subscriptions, and business operations.",
  },
  {
    q: "What is Krios Points?",
    a: "Krios Points is a salon loyalty and customer retention platform that helps businesses engage customers through loyalty points, coupons, spin wheels, scratch cards, and rewards.",
  },
  {
    q: "How can a salon increase customer retention?",
    a: "Salons can improve customer retention by offering personalized experiences, loyalty rewards, coupons, memberships, promotional offers, and incentives that encourage customers to return.",
  },
  {
    q: "Can Kriosapp help with salon marketing?",
    a: "Yes. Krios Desk includes marketing campaign capabilities, including WhatsApp-based customer communication, while Krios Points enables loyalty-driven promotions and rewards.",
  },
  {
    q: "Can Kriosapp help manage salon employees?",
    a: "Yes. Krios Desk includes staff management and attendance management capabilities to help businesses manage their teams, schedules, attendance, and performance.",
  },
];

const DESK_LIST = ["Appointments", "CRM", "Inventory", "Staff", "Attendance", "Subscriptions", "Marketing", "Reports"];
const POINTS_LIST = [
  "Loyalty Points",
  "Spin Wheel",
  "Scratch Cards",
  "Coupons",
  "Rewards",
  "Customer Engagement",
  "Repeat Visits",
  "Retention",
];

function Ctas({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <Button asChild size="lg">
        <Link to="/register">
          Get Started <ArrowRight />
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <a href="mailto:hello@kriosapp.com">Book a Demo</a>
      </Button>
    </div>
  );
}

export function Home() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
          <a href="#top" className="flex items-center gap-2">
            <img src={BRAND_LOGO} alt="Kriosapp" width={36} height={36} className="size-9 shrink-0 object-contain" />
            <div>
              <p className="font-display text-base leading-none">Kriosapp</p>
              <p className="mt-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Salon & Spa</p>
            </div>
          </a>
          <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
            <a href="#krios-desk" className="hover:text-foreground">
              Krios Desk
            </a>
            <a href="#krios-points" className="hover:text-foreground">
              Krios Points
            </a>
            <a href="#why" className="hover:text-foreground">
              Why Kriosapp
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild size="sm" className="hidden min-[380px]:inline-flex">
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto max-w-6xl px-3 py-12 sm:px-6 sm:py-24">
          <p className="text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
            Kriosapp — Salon & Spa Management Software
          </p>
          <h1 className="font-display mt-4 max-w-4xl text-3xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Complete Salon Management Software to Manage, Engage & Grow
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Kriosapp is an all-in-one salon and spa management platform designed to simplify daily operations, improve
            customer engagement, and increase repeat business.
          </p>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            With Krios Desk for salon management and Krios Points for customer loyalty, you can manage appointments,
            customers, inventory, staff, subscriptions, marketing campaigns, rewards, coupons, and loyalty programs from
            one connected platform.
          </p>
          <p className="mt-4 max-w-2xl text-sm font-medium">
            Manage your salon smarter. Build stronger customer relationships. Grow your business.
          </p>
          <Ctas className="mt-8" />
        </section>

        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-3 py-12 sm:px-6 sm:py-16">
            <h2 className="font-display text-2xl tracking-tight sm:text-3xl">All-in-One Software for Salons & Spas</h2>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
              Running a salon or spa involves more than providing great services. You need to manage appointments,
              customers, employees, inventory, marketing, payments, subscriptions, and customer retention.
            </p>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
              Kriosapp brings these essential functions together in one powerful salon management solution. Whether you
              run a beauty salon, hair salon, spa, unisex salon, wellness center, or growing salon business, Kriosapp
              helps you streamline operations and create better customer experiences.
            </p>
            <h3 className="font-display mt-10 text-xl tracking-tight">One Platform. Two Powerful Solutions.</h3>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <LayoutDashboard className="size-5 text-primary" />
                <h4 className="mt-3 text-lg font-semibold">Krios Desk</h4>
                <p className="mt-1 text-sm text-muted-foreground">Salon POS, CRM & business management software.</p>
              </article>
              <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <Gift className="size-5 text-primary" />
                <h4 className="mt-3 text-lg font-semibold">Krios Points</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Customer loyalty and retention software for salons and spas.
                </p>
              </article>
            </div>
            <p className="mt-6 max-w-3xl text-sm text-muted-foreground">
              Together, they help you manage your operations, engage customers, encourage repeat visits, and grow your
              revenue.
            </p>
          </div>
        </section>

        <section id="krios-desk" className="mx-auto max-w-6xl scroll-mt-20 px-3 py-12 sm:px-6 sm:py-16">
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">Krios Desk</p>
          <h2 className="font-display mt-2 text-2xl tracking-tight sm:text-3xl">Salon Management Software Built for Your Business</h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Krios Desk is a salon and spa management software solution that helps you manage your day-to-day operations
            from one place. From appointment scheduling and customer management to inventory, staff, attendance,
            subscriptions, and marketing, Krios Desk gives salon owners and managers better visibility and control over
            their business.
          </p>
          <h3 className="mt-10 text-lg font-semibold">Powerful Features for Salon & Spa Management</h3>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {DESK_FEATURES.map(({ icon: Icon, title, lead, points, closer }) => (
              <article key={title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <Icon className="size-5 text-primary" />
                <h4 className="mt-3 font-semibold">{title}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{lead}</p>
                {points.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {points.map((p) => (
                      <li key={p} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {closer ? <p className="mt-3 text-sm font-medium">{closer}</p> : null}
              </article>
            ))}
          </div>
        </section>

        <section id="krios-points" className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl scroll-mt-20 px-3 py-12 sm:px-6 sm:py-16">
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">Krios Points</p>
            <h2 className="font-display mt-2 text-2xl tracking-tight sm:text-3xl">
              Salon Loyalty Program Software That Brings Customers Back
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
              Getting a customer through your salon door is only the beginning. Krios Points helps salons and spas
              increase customer retention through loyalty points, coupons, rewards, spin wheels, and scratch cards.
            </p>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
              Give your customers more reasons to return, engage with your brand, and choose your salon again.
            </p>
            <p className="mt-4 text-sm font-semibold">Reward. Engage. Retain.</p>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {POINT_BLOCKS.map((block) => (
                <article key={block.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                  <Trophy className="size-5 text-primary" />
                  <h3 className="mt-3 font-semibold">{block.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{block.lead}</p>
                  <p className="mt-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{block.intro}</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {block.points.map((p) => (
                      <li key={p} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm font-medium">{block.closer}</p>
                </article>
              ))}
            </div>
            <h3 className="font-display mt-12 text-xl tracking-tight">How Krios Points Helps Your Salon Grow</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {GROWTH.map((item) => (
                <article key={item.title} className="rounded-xl border border-border bg-background p-5">
                  <h4 className="text-sm font-semibold">{item.title}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-3 py-12 sm:px-6 sm:py-16">
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">Krios Desk + Krios Points</h2>
          <p className="mt-2 text-lg text-muted-foreground">The Complete Salon Management & Customer Loyalty Solution</p>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Why use separate systems for managing your salon and engaging your customers? With Krios Desk + Krios Points,
            you can connect your daily salon operations with customer loyalty and retention.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-semibold">Krios Desk helps you manage your business</h3>
              <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {DESK_LIST.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Sparkles className="size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-semibold">Krios Points helps you grow your customer relationships</h3>
              <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {POINTS_LIST.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Gift className="size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
          <h3 className="font-display mt-12 text-xl tracking-tight">From Appointment to Loyalty</h3>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {JOURNEY.map((step) => (
              <li key={step.n} className="rounded-xl border border-border bg-card p-4">
                <p className="font-display text-2xl text-primary">{step.n}</p>
                <p className="mt-1 text-sm font-semibold">{step.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="why" className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl scroll-mt-20 px-3 py-12 sm:px-6 sm:py-16">
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">Why Choose Kriosapp?</p>
            <h2 className="font-display mt-2 text-2xl tracking-tight sm:text-3xl">Everything You Need to Run a Modern Salon</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {WHY.map((item) => (
                <article key={item.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
                </article>
              ))}
            </div>
            <h3 className="font-display mt-12 text-xl tracking-tight">Built for Salons & Spas</h3>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Kriosapp is designed for businesses that want to modernize their salon management and customer engagement.
            </p>
            <p className="mt-4 text-sm font-medium">Ideal for:</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {IDEAL_FOR.map((item) => (
                <li key={item} className="rounded-full border border-border bg-background px-3 py-1 text-sm">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-6xl scroll-mt-20 px-3 py-12 sm:px-6 sm:py-16">
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="mt-6">
            {FAQ.map((item, i) => (
              <AccordionItem key={item.q} value={`faq-${i}`}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-3 py-12 text-center sm:px-6 sm:py-16">
            <h2 className="font-display text-2xl tracking-tight sm:text-3xl">Ready to Transform Your Salon?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
              Manage Smarter. Engage Better. Retain Customers. Grow Faster.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
              Kriosapp gives salons and spas the technology they need to simplify operations and build lasting customer
              relationships.
            </p>
            <p className="mx-auto mt-6 max-w-xl text-sm">
              Start with Krios Desk. Manage your salon. Grow with Krios Points. Reward your customers. Grow with
              Kriosapp. Build a better salon business.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <a href="mailto:hello@kriosapp.com">Book a Demo</a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="mailto:hello@kriosapp.com">Talk to Our Team</a>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link to="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-3 py-8 text-xs text-muted-foreground sm:px-6">
          <span>© {new Date().getFullYear()} Kriosapp. Salon & spa management software.</span>
          <div className="flex gap-4">
            <a href="#krios-desk" className="hover:text-foreground">
              Krios Desk
            </a>
            <a href="#krios-points" className="hover:text-foreground">
              Krios Points
            </a>
            <Link to="/login" className="hover:text-foreground">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
