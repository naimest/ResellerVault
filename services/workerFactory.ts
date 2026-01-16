// This worker runs in a separate thread to avoid main-thread throttling
// when the tab is inactive/backgrounded.

const workerCode = `
  let timerId = null;

  self.onmessage = function(e) {
    const { action, interval } = e.data;

    if (action === 'START') {
      if (timerId) clearInterval(timerId);
      
      // Initial tick immediately? No, wait for interval.
      console.log('Worker: Background Timer started for ' + interval + 'ms');
      
      timerId = setInterval(() => {
        self.postMessage('TICK');
      }, interval);
    } 
    else if (action === 'STOP') {
      if (timerId) clearInterval(timerId);
      timerId = null;
      console.log('Worker: Background Timer stopped');
    }
  };
`;

export const createTimerWorker = (): Worker => {
  const blob = new Blob([workerCode], { type: "application/javascript" });
  return new Worker(URL.createObjectURL(blob));
};
