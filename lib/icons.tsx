import {
  Newspaper,
  ChatCircle,
  Hash,
  Cloud,
  PlayCircle,
  Camera,
  Globe,
} from "@phosphor-icons/react";
import { ReactNode } from "react";

/**
 * Map content platform to Phosphor icon component
 */
export function getPlatformIcon(
  platform: string,
  size: number = 16,
  weight: "thin" | "light" | "regular" | "bold" | "fill" = "regular"
): ReactNode {
  const iconProps = { size, weight };

  switch (platform.toLowerCase()) {
    case "substack":
      return <Newspaper {...iconProps} />;
    case "warpcast":
      return <ChatCircle {...iconProps} />;
    case "threads":
      return <Hash {...iconProps} />;
    case "bluesky":
      return <Cloud {...iconProps} />;
    case "youtube":
      return <PlayCircle {...iconProps} />;
    case "instagram":
      return <Camera {...iconProps} />;
    case "other":
    default:
      return <Globe {...iconProps} />;
  }
}
