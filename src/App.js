import React, { useEffect, useRef ,useState} from 'react';
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from 'https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0';

const WebcamFeed = () => {
  const videoRef = useRef(null);
  const canvasElementRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  let runningMode = 'IMAGE'; // 초기 실행 모드 설정
  let webcamRunning = false; // 웹캠 실행 여부를 나타내는 변수
  let lastVideoTime = -1; // 마지막 비디오 프레임의 시간을 저장하는 변수

  const [countdown, setCountdown] = useState(3);
  const [count, setCount] = useState(0);
  const [isCounting, setIsCounting] = useState(false);

  useEffect(() => {
    let intervalId;
    let countdownInterval;

    // 버튼을 누를 때만 카운트가 자동으로 증가하도록 설정
    if (isCounting && count < 5) {
      intervalId = setInterval(() => {
        setCount((prevCount) => prevCount + 1);
      }, 1000);
    }

    if (count === 5) {

      if (countdown !== 0) {
        countdownInterval = setInterval(() => {
          setCountdown((prevCountdown) => {
            // countdown이 0이면 clearInterval로 interval 정리하고 countdown 중지
            if (prevCountdown === 1) {
              clearInterval(countdownInterval);
              setIsCounting(false); // countdown 중지
            }
            return prevCountdown - 1;
          });
        }, 1000);
      }
    }

    // 컴포넌트가 언마운트되면 clearInterval로 인터벌 정리
    return () => clearInterval(intervalId);
  }, [isCounting, count]);


  const toggleCounting = () => {
    // 버튼 클릭 시 isCounting 상태를 토글
    setIsCounting((prevIsCounting) => !prevIsCounting);

    // isCounting이 false이면 count를 0으로 초기화
    if (!isCounting) {
      setCount(0);
    }
  };

  // 웹캠 활성화 함수
  const enableCam = () => {
    if (!poseLandmarkerRef.current) {
      console.log('기다려주세요! 포즈 랜드마커가 아직 로드되지 않았습니다.');
      return;
    }

    if (webcamRunning === true) {
      webcamRunning = false; // 웹캠 실행 중이면 중지
    } else {
      webcamRunning = true; // 웹캠이 실행 중이 아니면 시작

      // 5초 후에 웹캠 중지
      setTimeout(() => {
        webcamRunning = false;
      }, 5000);
    }

    const constraints = { video: true };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', predictWebcam);
      })
      .catch((error) => {
        console.error('웹캠 액세스 중 오류 발생:', error);
      });
  };

  // 웹캠에서 포즈 예측 함수
  const predictWebcam = () => {
    const startTimeMs = performance.now();

    if (runningMode === 'IMAGE') {
      runningMode = 'VIDEO';
      poseLandmarkerRef.current.setOptions({ runningMode: 'VIDEO' });
    }

    if (lastVideoTime !== videoRef.current.currentTime) {
      lastVideoTime = videoRef.current.currentTime;

      // 비디오에서 포즈 감지
      poseLandmarkerRef.current.detectForVideo(
        videoRef.current,
        startTimeMs,
        (result) => {
          const canvasCtx = canvasElementRef.current.getContext('2d');
          const drawingUtils = new DrawingUtils(canvasCtx);

          const { videoWidth, videoHeight } = videoRef.current;
          canvasElementRef.current.width = videoWidth;
          canvasElementRef.current.height = videoHeight;

          const pose = result.landmarks;
          console.log(pose); // 포즈 정보를 콘솔에 출력

          canvasCtx.save();
          canvasCtx.clearRect(0, 0, videoWidth, videoHeight);

          // 추출된 포즈를 캔버스에 그리기
          for (const landmark of result.landmarks) {
            drawingUtils.drawLandmarks(landmark, {
              radius: (data) =>
                DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1),
            });
            drawingUtils.drawConnectors(
              landmark,
              PoseLandmarker.POSE_CONNECTIONS
            );
          }

          canvasCtx.restore();
        }
      );
    }

    if (webcamRunning === true) {
      window.requestAnimationFrame(predictWebcam);
    }
  };

  useEffect(() => {
    // 포즈 랜드마커 생성 함수
    const createPoseLandmarker = async () => {
      console.log('포즈 랜드마커 생성 중...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );
      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: runningMode,
          numPoses: 2,
        }
      );
      console.log('포즈 랜드마커 생성 완료!');
    };

    // 컴포넌트 마운트 시 포즈 랜드마커 생성
    createPoseLandmarker();
  }, []); // 빈 배열은 컴포넌트 마운트 시에만 실행

  return (
    <div style={{ position: 'relative' }}>
      <video id="webcam" ref={videoRef} autoPlay controls></video>
      <canvas
        id="output_canvas"
        ref={canvasElementRef}
        style={{ position: 'absolute', top: 0, left: 0 }}
      ></canvas>

      <button id="webcamButton" onClick={enableCam}>
        웹 캠 켜기
      </button>
      <h2>{count}</h2>
      <h1>{countdown}</h1>
      <button id="countButton" onClick={toggleCounting}>
        {isCounting ? '카운트 중지' : '카운팅 시작'}
      </button>
    </div>
  );
};

export default WebcamFeed;
