import { Link } from "@/lib/transition"
import Image from "next/image"
import { FaGithub, FaNpm } from "react-icons/fa"
import { HiOutlineArrowRight } from "react-icons/hi"

import { PageRoutes } from "@/lib/pageroutes"
import { buttonVariants } from "@/components/ui/button"

function HeroSection() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 py-24">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#1A1625] via-[#1A1625] to-background" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#7555A8]/20 via-transparent to-transparent" />

      {/* Animated glow behind logo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10">
        <div className="h-[400px] w-[400px] animate-pulse rounded-full bg-[#7555A8]/20 blur-[100px]" />
      </div>

      {/* Logo */}
      <div className="mb-8 animate-float">
        <Image
          src="/logo.svg"
          alt="Onion Lasagna"
          width={120}
          height={120}
          priority
          className="drop-shadow-[0_0_30px_rgba(117,85,168,0.5)]"
        />
      </div>

      {/* Headline */}
      <h1 className="mb-6 text-center text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
        Clean Architecture.
        <br />
        <span className="bg-gradient-to-r from-[#E5DEFF] via-[#7555A8] to-[#E5DEFF] bg-clip-text text-transparent">
          Layered Perfection.
        </span>
      </h1>

      {/* Subheadline */}
      <p className="mb-10 max-w-2xl text-center text-lg text-[#E5DEFF]/70 sm:text-xl">
        A TypeScript library for building backend applications using Onion/Hexagonal Architecture.
        Structure your code with the elegance it deserves.
      </p>

      {/* CTAs */}
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <Link
          href={`/docs${PageRoutes[0]?.href || ''}`}
          className={buttonVariants({
            size: "lg",
            className: "group gap-2 bg-[#7555A8] px-8 text-white hover:bg-[#8866B9]"
          })}
        >
          Get Started
          <HiOutlineArrowRight className="transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          href="https://github.com/Cosmneo/onion-lasagna"
          target="_blank"
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className: "gap-2 border-[#3E3252] bg-transparent text-[#E5DEFF] hover:bg-[#3E3252]/50"
          })}
        >
          <FaGithub className="h-5 w-5" />
          View on GitHub
        </Link>
      </div>

      {/* Install command */}
      <div className="mt-12 rounded-lg border border-[#3E3252] bg-[#1A1625]/80 px-6 py-3 font-mono text-sm text-[#E5DEFF]/80 backdrop-blur-sm">
        <span className="text-[#7555A8]">$</span> bunx create-onion-lasagna-app my-app
      </div>
    </section>
  )
}

function FeaturesSection() {
  const features = [
    {
      title: "Onion Architecture",
      description: "Clean separation of concerns with domain at the core. Dependencies flow inward, keeping your business logic pure.",
      icon: "🧅",
    },
    {
      title: "Framework Agnostic",
      description: "Works with Hono, Elysia, Fastify, or NestJS. Switch frameworks without rewriting your business logic.",
      icon: "🔌",
    },
    {
      title: "Validator Flexibility",
      description: "Choose your validation library: Zod, Valibot, ArkType, or TypeBox. Same patterns, your preferred tools.",
      icon: "✅",
    },
    {
      title: "Type-Safe by Design",
      description: "End-to-end TypeScript with strict types. Catch errors at compile time, not in production.",
      icon: "🛡️",
    },
  ]

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
          Why Onion Lasagna?
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-muted-foreground">
          Build maintainable, testable, and scalable applications with battle-tested architectural patterns.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-[#7555A8]/50 hover:shadow-[0_0_30px_rgba(117,85,168,0.1)]"
            >
              <div className="mb-4 text-4xl">{feature.icon}</div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ArchitectureSection() {
  const layers = [
    { name: "Presentation", color: "#3E3252", description: "Controllers, Routes, DTOs" },
    { name: "Infrastructure", color: "#58427C", description: "Repositories, External Services" },
    { name: "Application", color: "#7555A8", description: "Use Cases, Orchestration" },
    { name: "Domain", color: "#E5DEFF", description: "Entities, Value Objects, Rules", textDark: true },
  ]

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
          The Onion Layers
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-muted-foreground">
          Dependencies flow inward. The domain is protected. Your business logic stays pure.
        </p>

        <div className="flex flex-col items-center justify-center gap-8 lg:flex-row lg:gap-16">
          {/* Diagram */}
          <div className="relative flex items-center justify-center">
            <div className="relative h-[300px] w-[300px] sm:h-[400px] sm:w-[400px]">
              {layers.map((layer, i) => {
                const size = 100 - i * 20
                return (
                  <div
                    key={layer.name}
                    className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#E5DEFF]/30 transition-all hover:scale-105"
                    style={{
                      width: `${size}%`,
                      height: `${size}%`,
                      backgroundColor: layer.color,
                    }}
                  >
                    {i === layers.length - 1 && (
                      <span className="text-xs font-semibold text-[#1A1625] sm:text-sm">
                        Domain
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-4">
            {layers.map((layer) => (
              <div key={layer.name} className="flex items-center gap-4">
                <div
                  className="h-4 w-4 rounded-full border border-[#E5DEFF]/30"
                  style={{ backgroundColor: layer.color }}
                />
                <div>
                  <div className="font-semibold">{layer.name}</div>
                  <div className="text-sm text-muted-foreground">{layer.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CodeSection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
          Elegant API Design
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
          Clean, expressive code that reads like documentation.
        </p>

        <div className="overflow-hidden rounded-xl border border-border bg-[#1A1625]">
          <div className="flex items-center gap-2 border-b border-border bg-[#1A1625] px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <div className="h-3 w-3 rounded-full bg-[#28c840]" />
            <span className="ml-4 text-xs text-muted-foreground">create-user.use-case.ts</span>
          </div>
          <pre className="overflow-x-auto p-6 text-sm">
            <code className="text-[#E5DEFF]/90">{`import { BaseInboundAdapter } from '@cosmneo/onion-lasagna'

export class CreateUserUseCase extends BaseInboundAdapter<
  CreateUserInput,
  CreateUserOutput
> {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly emailService: EmailService
  ) {
    super()
  }

  async handle(input: CreateUserInput): Promise<CreateUserOutput> {
    // Domain logic stays pure
    const user = User.create(input.email, input.name)

    // Infrastructure through ports
    await this.userRepo.save(user)
    await this.emailService.sendWelcome(user.email)

    return { id: user.id.value }
  }
}`}</code>
          </pre>
        </div>
      </div>
    </section>
  )
}

function GetStartedSection() {
  const steps = [
    {
      step: "1",
      title: "Create your app",
      code: "bunx create-onion-lasagna-app my-app",
    },
    {
      step: "2",
      title: "Install dependencies",
      code: "cd my-app && bun install",
    },
    {
      step: "3",
      title: "Start building",
      code: "bun dev",
    },
  ]

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
          Get Started in Seconds
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
          From zero to clean architecture in three commands.
        </p>

        <div className="flex flex-col gap-6">
          {steps.map((item) => (
            <div
              key={item.step}
              className="flex items-center gap-6 rounded-xl border border-border bg-card p-6"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#7555A8] text-xl font-bold text-white">
                {item.step}
              </div>
              <div className="flex-1">
                <div className="mb-1 font-semibold">{item.title}</div>
                <code className="rounded bg-[#1A1625] px-3 py-1 font-mono text-sm text-[#E5DEFF]">
                  {item.code}
                </code>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#3E3252] to-[#58427C] p-12 text-center">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#7555A8]/40 via-transparent to-transparent" />

          <div className="relative">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Ready to build something beautiful?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-[#E5DEFF]/80">
              Join developers who are building maintainable, scalable applications with Onion Lasagna.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href={`/docs${PageRoutes[0]?.href || ''}`}
                className={buttonVariants({
                  size: "lg",
                  className: "gap-2 bg-white px-8 text-[#1A1625] hover:bg-[#E5DEFF]"
                })}
              >
                Read the Docs
                <HiOutlineArrowRight />
              </Link>
              <Link
                href="https://www.npmjs.com/package/@cosmneo/onion-lasagna"
                target="_blank"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "gap-2 border-white/30 text-white hover:bg-white/10"
                })}
              >
                <FaNpm className="h-5 w-5" />
                View on npm
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Onion Lasagna" width={24} height={24} />
          <span className="font-semibold">Onion Lasagna</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/docs/philosophy" className="hover:text-foreground">
            Docs
          </Link>
          <Link
            href="https://github.com/Cosmneo/onion-lasagna"
            target="_blank"
            className="hover:text-foreground"
          >
            GitHub
          </Link>
          <Link
            href="https://www.npmjs.com/package/@cosmneo/onion-lasagna"
            target="_blank"
            className="hover:text-foreground"
          >
            npm
          </Link>
        </div>
        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Cosmneo
        </div>
      </div>
    </footer>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <ArchitectureSection />
      <CodeSection />
      <GetStartedSection />
      <CTASection />
      <Footer />
    </main>
  )
}
