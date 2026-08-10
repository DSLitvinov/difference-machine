import { useId } from "react";
import { cn } from "@/lib/utils";

interface FolderIconProps {
  size?: number;
  className?: string;
}

/** shadcn-ui kit: Figma node 4026:5054 (Icon/128/folder). Source: sources/icons/folder/folder.svg */
export function FolderIcon({ size = 48, className }: FolderIconProps) {
  const id = useId();
  const filterId = `folder-icon-filter${id}`;
  const gradientId = `folder-icon-gradient${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <rect x="4" y="8" width="40" height="32" rx="3.22222" fill="#A8A29E" />
      <g filter={`url(#${filterId})`}>
        <path
          d="M20.9922 10.666C21.67 10.666 22.3306 10.8803 22.8799 11.2773L27.5674 14.666H40.7773C42.5569 14.666 44 16.1091 44 17.8887V36.7773C44 38.5569 42.5569 40 40.7773 40H7.22266C5.44307 40 4 38.5569 4 36.7773V17.8887C4 17.8514 4.00167 17.8143 4.00293 17.7773H4V13.8887C4.00002 12.1091 5.44308 10.666 7.22266 10.666H20.9922Z"
          fill={`url(#${gradientId})`}
        />
      </g>
      <defs>
        <filter
          id={filterId}
          x="3"
          y="8.66602"
          width="42"
          height="31.334"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="-1" />
          <feGaussianBlur stdDeviation="0.5" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>
        <linearGradient
          id={gradientId}
          x1="24"
          y1="10.666"
          x2="24"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D6D3D1" />
          <stop offset="1" stopColor="#706E6D" />
        </linearGradient>
      </defs>
    </svg>
  );
}
