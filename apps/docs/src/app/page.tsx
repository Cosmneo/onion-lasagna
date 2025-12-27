import { Link } from "@/lib/transition"
import Image from "next/image"
import { FaGithub, FaNpm } from "react-icons/fa"
import {
  LuArrowRight,
  LuBox,
  LuLayers,
  LuShieldCheck,
  LuZap,
  LuCode2,
  LuTerminal,
  LuCopy,
  LuCheck,
} from "react-icons/lu"
import { PageRoutes } from "@/lib/pageroutes"

function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-32">
      {/* Background Grid & Glow */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]" />
      </div>

      <div className="z-10 flex max-w-5xl flex-col items-center text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex animate-fade-in items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-primary/20">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            v1.0 Now Available
          </span>
        </div>

        {/* Logo & Headline */}
        <div className="mb-6 animate-float">
          <Image
            src="/logo-light.svg"
            alt="Onion Lasagna Logo"
            width={100}
            height={100}
            className="drop-shadow-[0_0_50px_rgba(124,58,237,0.3)] dark:hidden"
          />
          <Image
            src="/logo.svg"
            alt="Onion Lasagna Logo"
            width={100}
            height={100}
            className="hidden drop-shadow-[0_0_50px_rgba(124,58,237,0.3)] dark:block"
          />
        </div>

        <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground sm:text-7xl">
          Build Enterprise-Grade <br />
          <span className="bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">
            Backends that Scale.
          </span>
        </h1>

        <p className="mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          The hexagonal architecture framework for TypeScript. <br className="hidden sm:block" />
          Type-safe, framework-agnostic, and designed for long-term maintainability.
        </p>

        {/* Buttons */}
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href={`/docs${PageRoutes[0]?.href || ''}`}
            className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-md bg-primary px-8 font-medium text-primary-foreground shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(124,58,237,0.5)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] transition-transform duration-1000 group-hover:translate-x-[100%]" />
            <span className="flex items-center gap-2">
              Get Started
              <LuArrowRight className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            href="https://github.com/Cosmneo/onion-lasagna"
            target="_blank"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border bg-background/50 px-8 font-medium text-foreground backdrop-blur transition-colors hover:bg-muted"
          >
            <FaGithub className="h-5 w-5" />
            GitHub
          </Link>
        </div>

        {/* Social Proof / Frameworks */}
        <div className="mt-20">
          <p className="mb-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Works with your favorite frameworks
          </p>
          <div className="flex flex-wrap justify-center gap-8 grayscale transition-all hover:grayscale-0">
            {/* Simple text representations for now to avoid icon dependency issues */}
            {['Hono', 'NestJS', 'Fastify', 'Elysia'].map((fw) => (
              <span key={fw} className="text-xl font-bold text-foreground/40 transition-colors hover:text-foreground">
                {fw}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section className="container mx-auto px-6 py-24">
      <div className="mb-16 text-center">
        <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
          Why Onion Lasagna?
        </h2>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Stop debating folder structure. Start shipping features with a proven architectural pattern.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Feature 1 - Large Span */}
        <div className="group relative col-span-1 overflow-hidden rounded-2xl border border-border bg-card/50 p-8 backdrop-blur transition-all hover:border-primary/50 md:col-span-2">
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-[80px] transition-all group-hover:bg-primary/20" />
          <div className="relative z-10">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LuLayers className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold">Onion Architecture Standard</h3>
            <p className="text-muted-foreground">
              Strict separation of concerns. Your business logic (Domain) sits at the center, 
              completely isolated from frameworks, databases, and external APIs.
              Dependencies flow inward, making your core logic easy to test and maintain.
            </p>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="group relative overflow-hidden rounded-2xl border border-border bg-card/50 p-8 backdrop-blur transition-all hover:border-primary/50">
          <div className="relative z-10">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LuBox className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold">Framework Agnostic</h3>
            <p className="text-muted-foreground">
              Switch from Express to Fastify or Hono without rewriting a single line of business logic.
            </p>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="group relative overflow-hidden rounded-2xl border border-border bg-card/50 p-8 backdrop-blur transition-all hover:border-primary/50">
          <div className="relative z-10">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LuShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold">Type-Safe Core</h3>
            <p className="text-muted-foreground">
              End-to-end type safety with generics. Catch errors at compile time, not runtime.
            </p>
          </div>
        </div>

        {/* Feature 4 - Large Span */}
        <div className="group relative col-span-1 overflow-hidden rounded-2xl border border-border bg-card/50 p-8 backdrop-blur transition-all hover:border-primary/50 md:col-span-2">
          <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px] transition-all group-hover:bg-blue-500/20" />
          <div className="relative z-10">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LuZap className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold">Zero-Dependency Core</h3>
            <p className="text-muted-foreground">
              The core package has zero runtime dependencies. You only install what you need (validators, framework adapters) as peer dependencies. 
              Keeps your bundle size small and your supply chain secure.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function ArchitectureSection() {
  return (
    <section className="relative overflow-hidden border-y border-border/50 bg-background/50 py-24 backdrop-blur-sm">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      <div className="container mx-auto px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            The Flow of Control
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            See how data flows through the layers. Clean, predictable, and unidirectional.
          </p>
        </div>

        {/* Simplified Visualization */}
        <div className="relative mx-auto flex max-w-5xl flex-col items-center justify-center gap-8 lg:flex-row">
          
          {/* Layer Nodes */}
          <div className="flex w-full flex-col gap-4 lg:w-1/3">
             <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-purple-500/50">
                <div className="text-xs font-bold uppercase text-muted-foreground">Layer 1</div>
                <div className="text-lg font-bold text-foreground">Presentation</div>
                <div className="text-sm text-muted-foreground">Controllers, DTOs</div>
             </div>
             <div className="flex justify-center lg:hidden"><LuArrowRight className="rotate-90 text-muted-foreground" /></div>
             
             <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-purple-500/50">
                <div className="text-xs font-bold uppercase text-muted-foreground">Layer 2</div>
                <div className="text-lg font-bold text-foreground">Application</div>
                <div className="text-sm text-muted-foreground">Use Cases, Ports</div>
             </div>
             <div className="flex justify-center lg:hidden"><LuArrowRight className="rotate-90 text-muted-foreground" /></div>

             <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-purple-500/50">
                <div className="text-xs font-bold uppercase text-muted-foreground">Layer 3</div>
                <div className="text-lg font-bold text-primary">Domain</div>
                <div className="text-sm text-muted-foreground">Entities, Value Objects</div>
             </div>
          </div>

          {/* Central Graphic */}
          <div className="relative flex h-[300px] w-[300px] shrink-0 items-center justify-center rounded-full border border-border/50 bg-background/50 p-8 shadow-[0_0_100px_rgba(124,58,237,0.1)] lg:h-[400px] lg:w-[400px]">
             {/* Orbital Rings */}
             <div className="absolute inset-0 animate-[spin_10s_linear_infinite] rounded-full border border-dashed border-primary/20" />
             <div className="absolute inset-8 animate-[spin_15s_linear_infinite_reverse] rounded-full border border-dashed border-primary/30" />
             <div className="absolute inset-16 animate-[spin_20s_linear_infinite] rounded-full border border-dashed border-primary/40" />
             
             {/* Core */}
             <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary shadow-[0_0_50px_rgba(124,58,237,0.5)]">
                <span className="font-bold text-white">Core</span>
             </div>
          </div>

          {/* Infra Side */}
          <div className="flex w-full flex-col gap-4 lg:w-1/3">
             <div className="rounded-xl border border-border bg-card p-4 text-right shadow-sm transition-all hover:border-purple-500/50">
                <div className="text-xs font-bold uppercase text-muted-foreground">Infrastructure</div>
                <div className="text-lg font-bold text-foreground">Repositories</div>
                <div className="text-sm text-muted-foreground">Postgres, Mongo, etc.</div>
             </div>
             <div className="flex justify-center lg:hidden"><LuArrowRight className="rotate-90 text-muted-foreground" /></div>
             
             <div className="rounded-xl border border-border bg-card p-4 text-right shadow-sm transition-all hover:border-purple-500/50">
                <div className="text-xs font-bold uppercase text-muted-foreground">External</div>
                <div className="text-lg font-bold text-foreground">Services</div>
                <div className="text-sm text-muted-foreground">Stripe, AWS, SendGrid</div>
             </div>
          </div>

        </div>
      </div>
    </section>
  )
}

function CodeSection() {
  return (
    <section className="container mx-auto px-6 py-24">
      <div className="mb-12 flex flex-col items-center text-center">
        <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
          Developer Experience First
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          Write code that reads like english. Clear contracts, explicit dependencies.
        </p>
      </div>

      <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-border bg-zinc-50 dark:bg-[#0A0A0B] shadow-xl">
        {/* Window Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/5 px-4 py-3">
          <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full bg-[#FF5F56]" />
            <div className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
            <div className="h-3 w-3 rounded-full bg-[#27C93F]" />
          </div>
          <div className="text-xs font-medium text-muted-foreground">create-user.use-case.ts</div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Code Content */}
        <div className="overflow-x-auto p-6">
          <pre className="font-mono text-sm leading-relaxed">
            <code className="block text-zinc-700 dark:text-gray-300">
              <span className="text-purple-600 dark:text-purple-400">import</span> {'{ BaseInboundAdapter }'} <span className="text-purple-600 dark:text-purple-400">from</span> <span className="text-green-600 dark:text-green-400">'@cosmneo/onion-lasagna'</span>
              {'\n\n'}
              <span className="text-purple-600 dark:text-purple-400">export class</span> <span className="text-yellow-600 dark:text-yellow-300">CreateUserUseCase</span> <span className="text-purple-600 dark:text-purple-400">extends</span> <span className="text-yellow-600 dark:text-yellow-300">BaseInboundAdapter</span>&lt;{'\n'}
              {'  '}CreateUserInput,{'\n'}
              {'  '}CreateUserOutput{'\n'}
              &gt; {'{'}{'\n'}
              {'  '}<span className="text-purple-600 dark:text-purple-400">constructor</span>({'\n'}
              {'    '}<span className="text-blue-600 dark:text-blue-400">private readonly</span> userRepo: UserRepository,{'\n'}
              {'    '}<span className="text-blue-600 dark:text-blue-400">private readonly</span> emailService: EmailService{'\n'}
              {'  '}) {'{'}{'\n'}
              {'    '}<span className="text-blue-600 dark:text-blue-400">super</span>(){'\n'}
              {'  '}{'}'}{'\n\n'}
              {'  '}<span className="text-purple-600 dark:text-purple-400">async</span> <span className="text-blue-600 dark:text-blue-400">handle</span>(input: CreateUserInput): <span className="text-yellow-600 dark:text-yellow-300">Promise</span>&lt;CreateUserOutput&gt; {'{'}{'\n'}
              {'    '}<span className="text-gray-500">// 1. Domain logic stays pure</span>{'\n'}
              {'    '}<span className="text-purple-600 dark:text-purple-400">const</span> user = <span className="text-yellow-600 dark:text-yellow-300">User</span>.create(input.email, input.name){'\n\n'}
              {'    '}<span className="text-gray-500">// 2. Infrastructure through ports</span>{'\n'}
              {'    '}<span className="text-purple-600 dark:text-purple-400">await</span> <span className="text-blue-600 dark:text-blue-400">this</span>.userRepo.save(user){'\n'}
              {'    '}<span className="text-purple-600 dark:text-purple-400">await</span> <span className="text-blue-600 dark:text-blue-400">this</span>.emailService.sendWelcome(user.email){'\n\n'}
              {'    '}<span className="text-purple-600 dark:text-purple-400">return</span> {'{'} id: user.id.value {'}'}{'\n'}
              {'  '}{'}'}{'\n'}
              {'}'}
            </code>
          </pre>
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="container mx-auto px-6 py-24">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0B] px-6 py-24 text-center shadow-2xl md:px-12">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-30%,#7C3AED15,transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_130%,#7C3AED15,transparent)]" />
        
        <div className="relative z-10 mx-auto max-w-3xl">
          <h2 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Ready to standardise your backend?
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg text-zinc-400">
            Join the developers building scalable, maintainable systems with Onion Lasagna.
            Production-ready architecture, straight out of the box.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={`/docs${PageRoutes[0]?.href || ''}`}
              className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-md bg-primary px-8 font-medium text-primary-foreground shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(124,58,237,0.5)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] transition-transform duration-1000 group-hover:translate-x-[100%]" />
              <span className="flex items-center gap-2">
                Start Building
                <LuArrowRight className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>

            <div className="group relative flex h-12 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/5 px-6 font-mono text-sm text-zinc-300 transition-colors hover:bg-white/10">
               <span className="mr-3 select-none text-zinc-500">$</span>
               <span>bunx create-onion-lasagna-app</span>
               <button className="ml-4 flex items-center justify-center text-zinc-500 transition-colors hover:text-white" title="Copy command">
                  <LuCopy className="h-4 w-4" />
               </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <HeroSection />
      <FeaturesSection />
      <ArchitectureSection />
      <CodeSection />
      <CTASection />
    </main>
  )
}
