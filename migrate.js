const fs = require('fs');
const path = require('path');

const map = {
  Activity: 'PiActivityFill',
  AlertCircle: 'PiInfoFill',
  AlertTriangle: 'PiWarningFill',
  ArrowDown: 'PiArrowDownBold',
  ArrowDownToLine: 'PiDownloadSimpleBold',
  ArrowLeft: 'PiCaretLeftBold',
  AudioLines: 'PiWaveformBold',
  BadgeCheck: 'PiSealCheckFill',
  Bell: 'PiBellFill',
  BellOff: 'PiBellSlashFill',
  BellRing: 'PiBellRingingFill',
  BookOpen: 'PiBookOpenFill',
  Building2: 'PiBuildingsFill',
  Cake: 'PiCakeFill',
  CalendarCheck: 'PiCalendarCheckFill',
  CalendarClock: 'PiCalendarFill',
  Camera: 'PiCameraFill',
  CameraOff: 'PiCameraSlashFill',
  Car: 'PiCarFill',
  Check: 'PiCheckBold',
  CheckCircle: 'PiCheckCircleFill',
  CheckCircle2: 'PiCheckCircleFill',
  ChevronDown: 'PiCaretDownBold',
  ChevronLeft: 'PiCaretLeftBold',
  ChevronRight: 'PiCaretRightBold',
  ChevronUp: 'PiCaretUpBold',
  CircleDollarSign: 'PiCurrencyDollarSimpleFill',
  CircleDot: 'PiCircleFill',
  Clock: 'PiClockFill',
  Coins: 'PiCoinsFill',
  Copy: 'PiCopyFill',
  CreditCard: 'PiCreditCardFill',
  Crown: 'PiCrownFill',
  Delete: 'PiBackspaceFill',
  Dices: 'PiDiceFiveFill',
  FileText: 'PiFileTextFill',
  Flag: 'PiFlagFill',
  Flame: 'PiFireFill',
  FlipHorizontal: 'PiArrowsLeftRightBold',
  Gamepad2: 'PiGameControllerFill',
  Gem: 'PiDiamondFill',
  Gift: 'PiGiftFill',
  Globe: 'PiGlobeHemisphereWestFill',
  Headphones: 'PiHeadphonesFill',
  Heart: 'PiHeartFill',
  HelpCircle: 'PiQuestionFill',
  History: 'PiClockCounterClockwiseFill',
  Image: 'PiImageFill',
  Info: 'PiInfoFill',
  KeyRound: 'PiKeyFill',
  LayoutGrid: 'PiSquaresFourFill',
  Lightbulb: 'PiLightbulbFill',
  LineChart: 'PiChartLineUpFill',
  Link2: 'PiLinkBold',
  Loader2: 'PiSpinnerBold',
  Lock: 'PiLockFill',
  LogOut: 'PiSignOutBold',
  Mail: 'PiEnvelopeSimpleFill',
  MapPin: 'PiMapPinFill',
  Medal: 'PiMedalFill',
  Megaphone: 'PiMegaphoneFill',
  MessageCircle: 'PiChatCircleFill',
  MessageSquare: 'PiChatTeardropFill',
  Mic: 'PiMicrophoneFill',
  MicOff: 'PiMicrophoneSlashFill',
  Moon: 'PiMoonFill',
  MoreHorizontal: 'PiDotsThreeBold',
  MoreVertical: 'PiDotsThreeVerticalBold',
  Music: 'PiMusicNoteFill',
  Music4: 'PiMusicNotesFill',
  Orbit: 'PiPlanetFill',
  Package: 'PiPackageFill',
  Pause: 'PiPauseFill',
  Phone: 'PiPhoneFill',
  PhoneCall: 'PiPhoneCallFill',
  PhoneOff: 'PiPhoneSlashFill',
  Plane: 'PiAirplaneFill',
  Play: 'PiPlayFill',
  Plus: 'PiPlusBold',
  Radio: 'PiRadioFill',
  Repeat: 'PiArrowsClockwiseBold',
  RotateCcw: 'PiArrowCounterClockwiseBold',
  Save: 'PiFloppyDiskFill',
  Search: 'PiMagnifyingGlassBold',
  Send: 'PiPaperPlaneRightFill',
  Settings: 'PiGearFill',
  Settings2: 'PiSlidersFill',
  Share2: 'PiShareNetworkFill',
  ShieldAlert: 'PiShieldWarningFill',
  ShieldCheck: 'PiShieldCheckFill',
  Shirt: 'PiTShirtFill',
  ShoppingBag: 'PiToteFill',
  SlidersHorizontal: 'PiSlidersHorizontalFill',
  Smile: 'PiSmileyFill',
  Sparkles: 'PiSparkleFill',
  Star: 'PiStarFill',
  Sticker: 'PiStickerFill',
  Store: 'PiStorefrontFill',
  Sun: 'PiSunFill',
  Swords: 'PiSwordFill',
  Tag: 'PiTagFill',
  Trash2: 'PiTrashFill',
  Trophy: 'PiTrophyFill',
  Tv: 'PiTelevisionFill',
  Undo2: 'PiArrowUUpLeftBold',
  Unlink: 'PiLinkBreakBold',
  Upload: 'PiUploadSimpleBold',
  User: 'PiUserFill',
  UserCog: 'PiUserGearFill',
  UserPlus: 'PiUserPlusFill',
  UserRound: 'PiUserCircleFill',
  UserSquare2: 'PiUserSquareFill',
  Users: 'PiUsersFill',
  UsersRound: 'PiUsersThreeFill',
  Video: 'PiVideoCameraFill',
  VideoOff: 'PiVideoCameraSlashFill',
  Volume2: 'PiSpeakerHighFill',
  VolumeX: 'PiSpeakerSlashFill',
  Wallet: 'PiWalletFill',
  Wand2: 'PiMagicWandFill',
  X: 'PiXBold',
  XCircle: 'PiXCircleFill',
  Zap: 'PiLightningFill',
  ZoomIn: 'PiMagnifyingGlassPlusFill',
  ZoomOut: 'PiMagnifyingGlassMinusFill',
};

function scan(dir) {
  let count = 0;
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      count += scan(full);
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      let content = fs.readFileSync(full, 'utf8');
      if (content.includes('lucide-react')) {
        const regex = /import\s+{([^}]+)}\s+from\s+['"]lucide-react['"];?/g;
        let modified = false;
        content = content.replace(regex, (match, importsStr) => {
          modified = true;
          const imports = importsStr.split(',').map(i => i.trim()).filter(Boolean);
          const mappedImports = [];
          imports.forEach(imp => {
            const parts = imp.split(' as ');
            const original = parts[0].trim();
            const alias = parts[1] ? parts[1].trim() : original;
            const piEquivalent = map[original];
            if (piEquivalent) {
              if (piEquivalent === alias) {
                mappedImports.push(piEquivalent);
              } else {
                mappedImports.push(`${piEquivalent} as ${alias}`);
              }
            } else {
              console.warn(`WARNING: No mapping for ${original} in ${full}`);
              // Fallback to PiQuestionFill so it doesn't break
              mappedImports.push(`PiQuestionFill as ${alias}`);
            }
          });
          return `import { ${mappedImports.join(', ')} } from 'react-icons/pi';`;
        });

        if (modified) {
          fs.writeFileSync(full, content, 'utf8');
          count++;
        }
      }
    }
  });
  return count;
}

const numFiles = scan('packages/app-user/src');
console.log(`Successfully migrated icons in ${numFiles} files!`);
