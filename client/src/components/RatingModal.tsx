import React, { useState } from 'react';
import toast from 'react-hot-toast';
import API from '../services/api';

interface RatingModalProps {
  userId: number;
  userName: string;
  listingId?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RatingModal({ userId, userName, listingId, onClose, onSuccess }: RatingModalProps) {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        to_user_id: userId,
        rating,
      };
      if (reviewText.trim()) payload.review_text = reviewText.trim();
      if (listingId) payload.listing_id = listingId;

      await API.post('/ratings', payload);
      toast.success('Rating submitted successfully!');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Failed to submit rating';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const displayRating = hoveredStar !== null ? hoveredStar : rating;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Rate {userName}</h3>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: '1.5rem', padding: 4 }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Your Rating</label>
            <div style={{ display: 'flex', gap: 8, fontSize: '2rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'transform 0.2s',
                    color: star <= displayRating ? '#f59e0b' : '#d1d5db',
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  ⭐
                </button>
              ))}
            </div>
            <div className="muted-small" style={{ marginTop: 4 }}>
              {rating === 5 && 'Excellent'}
              {rating === 4 && 'Good'}
              {rating === 3 && 'Average'}
              {rating === 2 && 'Poor'}
              {rating === 1 && 'Very Poor'}
            </div>
          </div>

          <div className="form-group">
            <label>Review (Optional)</label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience with this user..."
              maxLength={1000}
              rows={4}
              style={{ resize: 'vertical' }}
            />
            <div className="muted-small">{reviewText.length}/1000 characters</div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
