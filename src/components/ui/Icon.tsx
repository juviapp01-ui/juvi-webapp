import type { CSSProperties } from 'react';
import type { IconType } from 'react-icons';
import { MdVerified } from 'react-icons/md';
import {
  IoAlertCircleOutline, IoArrowBack, IoArrowDownCircleOutline, IoArrowForward, IoBookOutline,
  IoBookmark, IoBookmarkOutline, IoBriefcaseOutline, IoBrushOutline, IoCamera, IoCameraOutline,
  IoChatbubble, IoChatbubbleOutline, IoCheckmarkCircle, IoCheckmarkCircleOutline, IoChevronDown,
  IoChevronForward, IoClose, IoCloseCircle, IoConstructOutline, IoCutOutline, IoEllipseOutline,
  IoEye, IoEyeOutline, IoFilm, IoFilmOutline, IoFlowerOutline, IoGridOutline, IoHeart, IoHeartOutline,
  IoHome, IoHomeOutline, IoImageOutline, IoLocate, IoLocationOutline, IoLogOutOutline, IoNavigate,
  IoNavigateOutline, IoPauseCircleOutline, IoPencil, IoPeople, IoPeopleOutline, IoPerson,
  IoPersonOutline, IoPlay, IoPlayCircle, IoPricetagOutline, IoRefresh, IoRibbonOutline, IoSchoolOutline,
  IoSearch, IoSearchOutline, IoSparklesOutline, IoStar, IoStarOutline, IoTimeOutline, IoTrendingUp,
  IoVideocamOutline,
} from 'react-icons/io5';

// The Ionicons the app uses, by the same names (`<Ionicons name="heart-outline" />`
// becomes `<Icon name="heart-outline" />`). Includes every name the admin can
// pick for a Learn banner item (admin ICON_OPTIONS).
const ICONS = {
  'alert-circle-outline': IoAlertCircleOutline,
  'arrow-back': IoArrowBack,
  'arrow-down-circle-outline': IoArrowDownCircleOutline,
  'arrow-forward': IoArrowForward,
  'book-outline': IoBookOutline,
  bookmark: IoBookmark,
  'bookmark-outline': IoBookmarkOutline,
  'briefcase-outline': IoBriefcaseOutline,
  'brush-outline': IoBrushOutline,
  camera: IoCamera,
  'camera-outline': IoCameraOutline,
  chatbubble: IoChatbubble,
  'chatbubble-outline': IoChatbubbleOutline,
  'checkmark-circle': IoCheckmarkCircle,
  'checkmark-circle-outline': IoCheckmarkCircleOutline,
  'chevron-down': IoChevronDown,
  'chevron-forward': IoChevronForward,
  close: IoClose,
  'close-circle': IoCloseCircle,
  'construct-outline': IoConstructOutline,
  'cut-outline': IoCutOutline,
  'ellipse-outline': IoEllipseOutline,
  eye: IoEye,
  'eye-outline': IoEyeOutline,
  film: IoFilm,
  'film-outline': IoFilmOutline,
  'flower-outline': IoFlowerOutline,
  'grid-outline': IoGridOutline,
  heart: IoHeart,
  'heart-outline': IoHeartOutline,
  home: IoHome,
  'home-outline': IoHomeOutline,
  'image-outline': IoImageOutline,
  locate: IoLocate,
  'location-outline': IoLocationOutline,
  'log-out-outline': IoLogOutOutline,
  navigate: IoNavigate,
  'navigate-outline': IoNavigateOutline,
  'pause-circle-outline': IoPauseCircleOutline,
  pencil: IoPencil,
  people: IoPeople,
  'people-outline': IoPeopleOutline,
  person: IoPerson,
  'person-outline': IoPersonOutline,
  play: IoPlay,
  'play-circle': IoPlayCircle,
  'pricetag-outline': IoPricetagOutline,
  refresh: IoRefresh,
  'ribbon-outline': IoRibbonOutline,
  'school-outline': IoSchoolOutline,
  search: IoSearch,
  'search-outline': IoSearchOutline,
  'sparkles-outline': IoSparklesOutline,
  star: IoStar,
  'star-outline': IoStarOutline,
  'time-outline': IoTimeOutline,
  'trending-up': IoTrendingUp,
  'videocam-outline': IoVideocamOutline,
  // MaterialIcons "verified" — the app's verified badge.
  verified: MdVerified,
} satisfies Record<string, IconType>;

export type IconName = keyof typeof ICONS;

export const isIconName = (name: string | null | undefined): name is IconName => !!name && name in ICONS;

export function Icon({
  name,
  size = 20,
  color = 'currentColor',
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: CSSProperties;
}) {
  const Glyph = ICONS[name];
  return <Glyph size={size} color={color} style={{ flexShrink: 0, display: 'block', ...style }} aria-hidden />;
}
