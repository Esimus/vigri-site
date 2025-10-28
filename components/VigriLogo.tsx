// components/VigriLogo.tsx
import Image from "next/image";

type Props = {
  className?: string;   
  alt?: string;
};

export default function VigriLogo({ className, alt = "VIGRI" }: Props) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <Image
        src="/logos/vigri-logo.webp"
        alt={alt}
        fill               
        sizes="44px"            
        priority={false}
      />
    </div>
  );
}
