import React, { useState, useEffect } from 'react';
import { Skeleton } from 'boneyard-js/react';

function TrainingPlansExample() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlan();
  }, []);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const data = {};
      setPlan(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Skeleton name="training-plans-page" loading={loading}>
      <div className="p-8 bg-gray-900 min-h-screen text-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Training Plans</h1>
          
          {!plan ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-800 p-8 rounded-xl">
                <h2>Beginner Plan</h2>
                <p>Perfect for those just starting...</p>
              </div>
              <div className="bg-gray-800 p-8 rounded-xl">
                <h2>5K Training Plan</h2>
                <p>Designed to help you run your first 5K...</p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-xl">
            </div>
          )}
        </div>
      </div>
    </Skeleton>
  );
}

export default TrainingPlansExample;
