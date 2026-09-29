import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiShieldCheckFill as ShieldCheck, PiBookOpenFill as BookOpen, PiFileTextFill as FileText, PiInfoFill as Info } from 'react-icons/pi';
import { legalDocs, type LegalDoc } from '../../content/legal';

interface LegalPageProps {
  doc: LegalDoc;
  icon?: 'privacy' | 'guidelines' | 'terms' | 'about';
}

const ICONS = {
  privacy: ShieldCheck,
  guidelines: BookOpen,
  terms: FileText,
  about: Info,
};

export const LegalPage = ({ doc, icon = 'privacy' }: LegalPageProps) => {
  const navigate = useNavigate();
  const Icon = ICONS[icon];

  return (
    <div className="min-h-screen bg-mesh">
      <div className="flex items-center gap-3 p-4 border-b border-line bg-white/70 backdrop-blur-lg sticky top-0 z-10">
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-brand-primary" />
          <h1 className="text-lg font-bold">{doc.title}</h1>
        </div>
      </div>

      <div className="p-5 space-y-6">
        <p className="text-xs text-ink-faint">Last updated: {doc.updated}</p>

        {doc.sections.map((section, i) => (
          <section key={i} className="card-glass p-4">
            <h2 className="font-bold text-brand-primary mb-2">{section.heading}</h2>
            <p className="text-sm text-dark-200 leading-relaxed whitespace-pre-line">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
};

export const PrivacyPolicy = () => <LegalPage doc={legalDocs.privacy} icon="privacy" />;
export const Guidelines = () => <LegalPage doc={legalDocs.guidelines} icon="guidelines" />;
export const Terms = () => <LegalPage doc={legalDocs.terms} icon="terms" />;
export const AboutUs = () => <LegalPage doc={legalDocs.about} icon="about" />;
