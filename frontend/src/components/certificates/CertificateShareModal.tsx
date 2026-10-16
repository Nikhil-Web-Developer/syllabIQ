import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Check, Share2, AlertCircle } from 'lucide-react';
import { useCertificates } from '@/services/certificates.hook';

interface CertificateShareModalProps {
  certificateId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CertificateShareModal: React.FC<CertificateShareModalProps> = ({
  certificateId,
  isOpen,
  onClose,
}) => {
  const [isPublic, setIsPublic] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const { createShareLink } = useCertificates();

  const handleCreateLink = async () => {
    if (!certificateId) return;

    const result = await createShareLink.mutateAsync({
      certificateId,
      isPublic,
      expiresAt: expiresAt || undefined,
    });

    setShareUrl(result.shareUrl);
  };

  const [shareUrl, setShareUrl] = useState<string>('');

  const handleCopyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Certificate
          </DialogTitle>
          <DialogDescription>
            Create a shareable link for your certificate. Others can view it using the link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Visibility option */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="public"
                checked={isPublic}
                onCheckedChange={(checked) => setIsPublic(checked as boolean)}
              />
              <Label htmlFor="public" className="font-normal cursor-pointer">
                Make this link publicly shareable (anyone with link can view)
              </Label>
            </div>
            {isPublic && (
              <div className="flex gap-2 p-3 bg-blue-50 rounded-md text-sm text-blue-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>Public links can be shared with anyone, anytime.</p>
              </div>
            )}
          </div>

          {/* Expiration option */}
          <div className="space-y-2">
            <Label htmlFor="expires">
              Expiration Date (optional)
            </Label>
            <Input
              id="expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={createShareLink.isPending}
            />
            <p className="text-xs text-gray-500">
              Leave empty for no expiration
            </p>
          </div>

          {/* Share URL display */}
          {shareUrl && (
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  onClick={handleCopyToClipboard}
                  variant="outline"
                  size="sm"
                  className="px-3"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
              {copied && (
                <p className="text-sm text-green-600">Link copied to clipboard!</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!shareUrl ? (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={createShareLink.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateLink}
                disabled={createShareLink.isPending}
              >
                {createShareLink.isPending ? 'Creating...' : 'Create Link'}
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
