import React, { useEffect, useRef } from 'react';
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from 'https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0';

const WebcamFeed = () => {
  // 비디오 및 캔버스 요소에 대한 참조
  const videoRef = useRef(null);
  const canvasElementRef = useRef(null);
  // 포즈 랜드마커에 대한 참조
  const poseLandmarkerRef = useRef(null);
  // 실행 모드 및 웹캠 상태를 관리하는 변수
  let runningMode = 'IMAGE';
  let webcamRunning = false;
  let lastVideoTime = -1;

  // 웹캠 활성화 함수
  const enableCam = () => {
    // 포즈 랜드마커가 로드되지 않았을 경우 에러 메시지 출력
    if (!poseLandmarkerRef.current) {
      console.log('기다려주세요! 포즈 랜드마커가 아직 로드되지 않았습니다.');
      return;
    }

    // 웹캠이 실행 중이면 중지하고, 실행 중이 아니면 시작
    if (webcamRunning === true) {
      webcamRunning = false;
    } else {
      webcamRunning = true;
    }

    // 웹캠 액세스 권한을 얻고 비디오 요소에 스트림 연결
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
    // 현재 시간 기록
    const startTimeMs = performance.now();
    // 이미지 모드에서 비디오 모드로 전환
    if (runningMode === 'IMAGE') {
      runningMode = 'VIDEO';
      poseLandmarkerRef.current.setOptions({ runningMode: 'VIDEO' });
    }

    // 이전 비디오 시간과 현재 비디오 시간이 다르면 예측 수행
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
          console.log(pose);

          // 새로운 부분: 좌표값을 터미널에 출력
          // for (const landmark of result.landmarks) {
          //   console.log(`Landmark: (${landmark.x}, ${landmark.y}, ${landmark.z})`);
          // }

          // 캔버스에 랜드마크 및 커넥터 그리기
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, videoWidth, videoHeight);
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

    // 웹캠이 실행 중이면 다음 프레임 요청
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
        예측 활성화
      </button>
    </div>
  );
};

export default WebcamFeed;
