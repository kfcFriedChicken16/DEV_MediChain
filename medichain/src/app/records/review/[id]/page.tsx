'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import Button from '@/components/ui/Button';
import { useMedicalRegistry } from '@/lib/hooks';
import { toast } from 'react-hot-toast';
import AIAssistant from '@/components/AIAssistant';
import { MedicalRecord } from '@/lib/ai';
import { useRecordContext } from '@/context/RecordContext';

export default function RecordReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { isConnected, account, userType } = useWallet();
  const { getRecordIds, getRecord } = useMedicalRegistry();
  
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<any>(null);
  const [review, setReview] = useState({
    rating: 5,
    comment: '',
    isSubmitting: false
  });
  const [showAI, setShowAI] = useState(false);
  const { setCurrentRecord, setUserType } = useRecordContext();

  // Fetch the record details
  useEffect(() => {
    const fetchRecord = async () => {
      if (!isConnected || !account || !params.id) {
        return;
      }

      try {
        setLoading(true);
        // Get all record IDs
        const recordIds = await getRecordIds(account);
        
        // Find the matching record
        const recordId = recordIds.find((id: string) => {
          try {
            // Try to match by ID
            return id === params.id || id.includes(params.id as string);
          } catch (e) {
            return false;
          }
        });
        
        if (!recordId) {
          toast.error('Record not found');
          router.push('/records');
          return;
        }
        
        // Get the record details
        const recordDetails = await getRecord(account, recordId);
        const fullRecord = {
          ...recordDetails,
          id: Array.isArray(params.id) ? params.id[0] : params.id
        };
        setRecord(fullRecord);
        
        // Set the record in context for the floating bot
        setCurrentRecord({
          id: fullRecord.id,
          timestamp: fullRecord.timestamp,
          provider: fullRecord.provider,
          cid: fullRecord.cid,
          content: {} // Content would need to be fetched and decrypted separately
        });
        setUserType(userType);
      } catch (error) {
        console.error('Error fetching record:', error);
        toast.error('Failed to load record');
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [isConnected, account, params.id, getRecordIds, getRecord, router]);

  // Handle review submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!record) {
      toast.error('No record to review');
      return;
    }
    
    try {
      setReview(prev => ({ ...prev, isSubmitting: true }));
      
      // In a real application, you would submit this to the blockchain or a database
      toast.loading('Submitting review...', { id: 'submit-review' });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Review submitted successfully', { id: 'submit-review' });
      
      // Redirect back to records page
      setTimeout(() => {
        router.push('/records');
      }, 1000);
      
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review', { id: 'submit-review' });
    } finally {
      setReview(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  // Redirect if not connected or not a patient
  if (!isConnected || userType !== 'patient') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">Access Denied</h2>
          <p className="mb-6 text-yellow-700">
            You must be connected as a patient to review medical records.
          </p>
          <Button onClick={() => router.push('/')}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <button 
          onClick={() => router.push('/records')}
          className="mr-4 text-blue-600 hover:text-blue-800 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Records
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Review Medical Record</h1>
      </div>

      {loading ? (
        <div className="bg-white shadow rounded-lg p-6 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : record ? (
        <div className="space-y-6">
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-blue-50">
              <h2 className="text-lg font-medium text-gray-900">Record Information</h2>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Record ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{record.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">{new Date(record.timestamp * 1000).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Provider</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">
                    {record.provider.substring(0, 6)}...{record.provider.substring(record.provider.length - 4)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">IPFS CID</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{record.cid.substring(0, 10)}...</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-blue-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Your Review</h2>
                <Button
                  onClick={() => setShowAI(!showAI)}
                  variant="outline"
                  size="sm"
                >
                  {showAI ? 'Hide AI Assistant' : 'AI Health Analysis'}
                </Button>
              </div>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReview(prev => ({ ...prev, rating: star }))}
                        className="focus:outline-none"
                      >
                        <svg 
                          className={`w-8 h-8 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`} 
                          fill="currentColor" 
                          viewBox="0 0 20 20" 
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-gray-600">
                      {review.rating === 1 && 'Poor'}
                      {review.rating === 2 && 'Fair'}
                      {review.rating === 3 && 'Good'}
                      {review.rating === 4 && 'Very Good'}
                      {review.rating === 5 && 'Excellent'}
                    </span>
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                    Comments
                  </label>
                  <textarea
                    id="comment"
                    rows={4}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Share your experience with this medical record..."
                    value={review.comment}
                    onChange={(e) => setReview(prev => ({ ...prev, comment: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/records')}
                    className="mr-3"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={review.isSubmitting}
                    disabled={review.isSubmitting}
                  >
                    Submit Review
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* AI Assistant Section */}
          {showAI && record && (
            <div className="mt-6">
              <AIAssistant 
                record={{
                  id: record.id,
                  timestamp: record.timestamp,
                  provider: record.provider,
                  cid: record.cid,
                  content: {} // Content would need to be fetched and decrypted separately
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">Record not found.</p>
          <Button onClick={() => router.push('/records')} className="mt-4">
            Back to Records
          </Button>
        </div>
      )}
    </div>
  );
} 