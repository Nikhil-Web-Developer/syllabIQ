import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Upload, FileText, Video, Trash2, Download } from 'lucide-react';

export const TrainerLibraryPage: React.FC = () => {
  const resources = [
    {
      id: 'r-1',
      title: 'WRF Dynamic Equations Handbook.pdf',
      type: 'pdf',
      size: '4.2 MB',
      course: 'Numerical Weather Prediction with WRF 4.0',
    },
    {
      id: 'r-2',
      title: 'Doppler Radar Calibration Slides.ppt',
      type: 'ppt',
      size: '12.8 MB',
      course: 'Advanced Radar Meteorology & Cyclone Tracking',
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="Trainer Resource Library"
        description="Upload and manage lecture slide decks, PDFs, reference notes, and recorded video links."
        action={
          <Button>
            <Upload className="h-4 w-4" />
            Upload New File
          </Button>
        }
      />

      <div className="space-y-3">
        {resources.map((r) => (
          <Card key={r.id} className="flex items-center justify-between p-4 hover:border-slate-600 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-xl">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{r.title}</h3>
                <p className="text-xs text-slate-400">
                  {r.size} · Linked to: <span className="text-slate-300">{r.course}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary">
                <Download className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost">
                <Trash2 className="h-4 w-4 text-rose-400" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
