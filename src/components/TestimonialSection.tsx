"use client";

import AutoScroll from "embla-carousel-auto-scroll";
import { useRef } from "react";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const testimonials1 = [
  {
    name: "Sarah Johnson",
    role: "Agricultural Engineer",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp",
    content:
      "PESAFI transformed our pest control. Smart monitoring reduced our chemical use by 60% while improving yield quality significantly.",
  },
  {
    name: "Miguel Rodriguez",
    role: "Farm Manager",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-2.webp",
    content:
      "Real-time alerts saved our harvest. The AI predictions helped us act before pest infestations became costly problems.",
  },
  {
    name: "Dr. Emily Chen",
    role: "Crop Scientist",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-3.webp",
    content:
      "Revolutionary approach to sustainable farming. PESAFI's data-driven insights make precision agriculture truly accessible.",
  },
  {
    name: "James Wilson",
    role: "Organic Farmer",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-4.webp",
    content:
      "Finally, a solution that aligns with organic principles. Smart pest control without compromising our environmental values.",
  },
  {
    name: "Maria Santos",
    role: "Agricultural Consultant",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-5.webp",
    content:
      "PESAFI bridges traditional farming with modern technology. Our clients see immediate improvements in crop protection.",
  },
  {
    name: "David Kim",
    role: "Greenhouse Owner",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-6.webp",
    content:
      "Integrated monitoring system is game-changing. We've reduced pest-related losses by 80% using their smart solutions.",
  },
];
const testimonials2 = [
  {
    name: "Robert Thompson",
    role: "AgTech Specialist",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp",
    content:
      "Leading innovation in agricultural intelligence. PESAFI's platform represents the future of sustainable crop management.",
  },
  {
    name: "Lisa Martinez",
    role: "Farm Operations Director",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-2.webp",
    content:
      "Operational efficiency improved dramatically. Smart pest management reduced our labor costs while boosting productivity.",
  },
  {
    name: "Ahmed Hassan",
    role: "Precision Ag Researcher",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-3.webp",
    content:
      "Cutting-edge technology meets practical application. PESAFI delivers actionable insights that drive real farming success.",
  },
  {
    name: "Rachel Green",
    role: "Sustainable Farming Advocate",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-4.webp",
    content:
      "Environmental impact reduced significantly. Smart pest control helps us farm responsibly while maintaining profitability.",
  },
  {
    name: "Thomas Brown",
    role: "Agricultural Technology Manager",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-5.webp",
    content:
      "Implementation was seamless and results immediate. PESAFI's platform integrates perfectly with existing farm systems.",
  },
  {
    name: "Jennifer Lee",
    role: "Crop Protection Specialist",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-6.webp",
    content:
      "Data-driven pest management is revolutionary. Predictive analytics help farmers make informed decisions before problems arise.",
  },
];

const TestimonialSection = () => {
  const plugin1 = useRef(
    AutoScroll({
      startDelay: 500,
      speed: 0.7,
    })
  );

  const plugin2 = useRef(
    AutoScroll({
      startDelay: 500,
      speed: 0.7,
      direction: "backward",
    })
  );
  return (
    <section className="relative py-32 max-w-7xl mx-auto overflow-hidden">
      <div className="container flex flex-col items-center gap-6">
        <h2 className="mb-2 ">Trusted by Agricultural Leaders</h2>
        <p className="text-center ">
          Smart pest management for sustainable farming. Precision-driven, environmentally conscious solutions.
        </p>
      </div>
      <div className="lg:container">
        <div className="mt-16 space-y-4 relative">
          {/* Left and right blur gradients */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
          <Carousel
            opts={{
              loop: true,
            }}
            plugins={[plugin1.current]}
            onMouseLeave={() => plugin1.current.play()}
          >
            <CarouselContent>
              {testimonials1.map((testimonial, index) => (
                <CarouselItem key={index} className="basis-auto">
                  <Card className="max-w-96 p-6 select-none bg-white/80 backdrop-blur-md border border-neutral-200 shadow-md rounded-2xl">
                    <div className="mb-4 flex gap-4 items-center">
                      <Avatar className="size-10 rounded-full ring-2 ring-[#22C55E]/60 shadow">
                        <AvatarImage
                          src={testimonial.avatar}
                          alt={testimonial.name}
                        />
                      </Avatar>
                      <div className="text-sm">
                        <p className="font-semibold text-neutral-900">
                          {testimonial.name}
                        </p>
                        <p className="text-muted-foreground">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                    <q className="text-base text-neutral-700 italic">
                      {testimonial.content}
                    </q>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          <Carousel
            opts={{
              loop: true,
            }}
            plugins={[plugin2.current]}
            onMouseLeave={() => plugin2.current.play()}
          >
            <CarouselContent>
              {testimonials2.map((testimonial, index) => (
                <CarouselItem key={index} className="basis-auto">
                  <Card className="max-w-96 p-6 select-none bg-white/80 backdrop-blur-md border border-neutral-200 shadow-md rounded-2xl">
                    <div className="mb-4 flex gap-4 items-center">
                      <Avatar className="size-10 rounded-full ring-2 ring-[#10B981]/60 shadow">
                        <AvatarImage
                          src={testimonial.avatar}
                          alt={testimonial.name}
                        />
                      </Avatar>
                      <div className="text-sm">
                        <p className="font-semibold text-neutral-900">
                          {testimonial.name}
                        </p>
                        <p className="text-muted-foreground">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                    <q className="text-base text-neutral-700 italic">
                      {testimonial.content}
                    </q>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export { TestimonialSection };