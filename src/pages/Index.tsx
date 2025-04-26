
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted">
      {/* Hero section */}
      <header className="px-4 py-8 md:px-6 md:py-12 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
                <span className="text-vr-purple">VR Genesis Frame</span>
              </h1>
              <p className="text-xl text-muted-foreground md:text-2xl">
                Create, customize, and mint 3D objects as NFTs on Polkadot
              </p>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              <Link to="/vr">
                <Button size="lg" className="bg-vr-purple hover:bg-vr-purple/90">
                  Enter VR World
                </Button>
              </Link>
              <Link to="https://docs.substrate.io/" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline">
                  Learn About Polkadot
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative h-[350px] w-[350px] sm:h-[400px] sm:w-[400px] lg:h-[450px] lg:w-[450px]">
              <div className="absolute inset-0 grid h-full w-full place-items-center rounded-full bg-muted animate-rotate-slow">
                <div className="h-48 w-48 rounded-full border-8 border-vr-blue animate-float"></div>
              </div>
              <div className="absolute inset-0 grid h-full w-full place-items-center">
                <div className="h-64 w-64 rounded-[2rem] border-8 border-vr-purple bg-background shadow-lg animate-float"></div>
              </div>
              <div className="absolute inset-0 grid h-full w-full place-items-center">
                <div className="h-32 w-32 rotate-45 border-8 border-vr-blue bg-background shadow-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features section */}
      <section className="px-4 py-12 md:px-6 md:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Key Features</h2>
            <p className="mt-2 text-muted-foreground">
              Explore the possibilities with VR Genesis Frame
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Immersive VR Experience",
                description: "Navigate a 3D virtual environment using WebXR technology",
              },
              {
                title: "Create & Customize",
                description: "Design your own 3D objects with intuitive controls",
              },
              {
                title: "Polkadot Integration",
                description: "Connect to Polkadot wallets and interact with the ecosystem",
              },
              {
                title: "NFT Minting",
                description: "Transform your creations into NFTs on Polkadot parachains",
              },
              {
                title: "Cross-Chain Support",
                description: "Future interoperability with other blockchains via XCM",
              },
              {
                title: "Asset Gallery",
                description: "Showcase and manage your collection of 3D NFTs",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md"
              >
                <h3 className="text-xl font-bold text-vr-purple">{feature.title}</h3>
                <p className="mt-2 text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="bg-vr-dark text-white px-4 py-12 md:px-6 md:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-3xl font-bold">Ready to dive in?</h2>
          <p className="mt-2 text-gray-300">
            Start creating your own 3D NFTs in our immersive VR environment.
          </p>
          <Link to="/vr" className="mt-6 inline-block">
            <Button size="lg" className="bg-vr-purple hover:bg-vr-purple/90">
              Launch VR Genesis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card px-4 py-6 md:px-6">
        <div className="mx-auto max-w-6xl flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} VR Genesis Frame. All rights reserved.
            </p>
          </div>
          <div className="flex gap-4 text-muted-foreground">
            <Link to="#" className="text-sm hover:underline">
              Terms
            </Link>
            <Link to="#" className="text-sm hover:underline">
              Privacy
            </Link>
            <Link to="#" className="text-sm hover:underline">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
