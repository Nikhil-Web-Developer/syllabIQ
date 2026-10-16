import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Share2,
  Eye,
  Lock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface Certificate {
  id: string;
  traineeName: string;
  courseName: string;
  trainerName: string;
  score: number;
  issueDate: string;
  certificateCode: string;
  isRevoked: boolean;
  createdAt: string;
}

interface CertificateCardProps {
  certificate: Certificate;
  onDownload?: (certificateId: string) => void;
  onShare?: (certificateId: string) => void;
  onPreview?: (certificateId: string) => void;
  isLoading?: boolean;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
  certificate,
  onDownload,
  onShare,
  onPreview,
  isLoading = false,
}) => {
  const issueDate = new Date(certificate.issueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{certificate.courseName}</CardTitle>
            <CardDescription>Instructor: {certificate.trainerName}</CardDescription>
          </div>
          <div>
            {certificate.isRevoked ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Revoked
              </Badge>
            ) : (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Valid
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Score</p>
            <p className="font-semibold">{certificate.score}%</p>
          </div>
          <div>
            <p className="text-gray-500">Issued Date</p>
            <p className="font-semibold">{issueDate}</p>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-gray-500 mb-1">Certificate ID</p>
          <p className="text-xs font-mono bg-gray-50 p-2 rounded break-all">
            {certificate.certificateCode}
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        {onPreview && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview(certificate.id)}
            disabled={isLoading}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        )}

        {onDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload(certificate.id)}
            disabled={isLoading || certificate.isRevoked}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        )}

        {onShare && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShare(certificate.id)}
            disabled={isLoading}
            className="flex-1"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
