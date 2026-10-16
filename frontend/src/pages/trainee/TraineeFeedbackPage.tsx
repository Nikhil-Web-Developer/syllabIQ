import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Star, MessageSquare } from 'lucide-react';

export const TraineeFeedbackPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      navigate('/trainee/dashboard');
    }, 1500);
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <PageHeader
        title="Course & Trainer Feedback"
        description="Share your feedback to help enhance the capacity building modules and trainer effectiveness."
      />

      <Card>
        {isSubmitted ? (
          <div className="text-center py-8">
            <p className="text-base font-bold text-emerald-400">Thank you! Your feedback has been recorded.</p>
            <p className="text-xs text-slate-400 mt-2">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Overall Course &amp; Trainer Rating
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-slate-600 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-3 text-sm font-bold text-white">{rating} / 5 Stars</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Detailed Comments &amp; Suggestions
              </label>
              <textarea
                rows={4}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you learn? How was the pacing, material, and trainer clarity?"
                className="w-full rounded-xl bg-slate-900/80 border border-slate-700 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <Button type="submit" className="w-full">
              <MessageSquare className="h-4 w-4" />
              Submit Evaluation
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};
