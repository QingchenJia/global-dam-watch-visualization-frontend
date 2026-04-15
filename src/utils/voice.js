export const SPEECH_ERROR_CODES = {
    ABORTED: "aborted",
    NOT_ALLOWED: "not-allowed",
    SERVICE_NOT_ALLOWED: "service-not-allowed",
    AUDIO_CAPTURE: "audio-capture",
};

export const STOP_LISTENING_ERRORS = [
    SPEECH_ERROR_CODES.NOT_ALLOWED,
    SPEECH_ERROR_CODES.SERVICE_NOT_ALLOWED,
];

function getSpeechRecognitionImpl() {
    // 兼容不同浏览器的语音识别实现
    return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function createUnsupportedSpeechInput() {
    return {
        isSupported: false,
        start: () => false,
        stop: () => false,
        destroy: () => {},
    };
}

// 统一处理语音识别返回结构
// 输出清洗后的可用文本
function normalizeTranscript(result) {
    return String(result?.[0]?.transcript || "").trim();
}

export function createSpeechInput(options = {}) {
    // 默认语言为中文
    const { lang = "zh-CN", onStart, onResult, onEnd, onError } = options;
    // 兼容性检查
    const SpeechRecognitionImpl = getSpeechRecognitionImpl();

    if (!SpeechRecognitionImpl) {
        // 浏览器不支持语音识别直接返回一个不支持的实现
        return createUnsupportedSpeechInput();
    }

    const recognition = new SpeechRecognitionImpl();
    // 设置识别语言
    recognition.lang = lang;
    // 模式允许持续监听
    recognition.continuous = true;
    // 启用中间结果以便在用户说话时实时获取文本
    recognition.interimResults = true;
    // 设置返回结果的最大数量为1
    recognition.maxAlternatives = 1;

    // 内部状态变量
    let finalTranscript = "";
    // 中间结果文本
    // 用户说话时会不断更新
    // 直到最终结果确定
    let interimTranscript = "";
    // 是否应该继续监听
    let shouldKeepListening = false;
    // 当前是否正在识别
    let isRecognizing = false;
    // 是否已销毁实例
    let isDestroyed = false;
    // 用于跳过停止时可能出现的错误
    let skipNextError = false;

    function resetSessionText() {
        finalTranscript = "";
        interimTranscript = "";
    }

    function addFinalTranscript(transcript) {
        if (!finalTranscript) {
            finalTranscript = transcript;
            return;
        }

        finalTranscript = `${finalTranscript} ${transcript}`;
    }

    function updateTranscriptState(result) {
        const transcript = normalizeTranscript(result);

        if (!transcript) {
            return;
        }

        if (result.isFinal) {
            addFinalTranscript(transcript);
            interimTranscript = "";
            return;
        }

        interimTranscript = transcript;
    }

    function shouldIgnoreAbortedError(event) {
        if (!skipNextError) {
            return false;
        }

        return event?.error === SPEECH_ERROR_CODES.ABORTED;
    }

    function handleRecognitionError(event) {
        if (shouldIgnoreAbortedError(event)) {
            skipNextError = false;
            return;
        }

        // 权限或服务受限时终止自动续听
        // 避免进入无效重试循环
        if (STOP_LISTENING_ERRORS.includes(event?.error)) {
            shouldKeepListening = false;
        }

        onError?.(event);
    }

    function getSessionTranscript() {
        const transcript = (finalTranscript || interimTranscript).trim();
        return transcript;
    }

    function restartRecognitionIfNeeded() {
        if (!shouldKeepListening) {
            return false;
        }

        try {
            recognition.start();
            return true;
        } catch (error) {
            shouldKeepListening = false;
            onError?.(error);
            return false;
        }
    }

    recognition.onstart = () => {
        isRecognizing = true;
        resetSessionText();
        onStart?.();
    };

    recognition.onresult = (event) => {
        // 只处理增量识别结果
        // 避免重复拼接历史文本
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
            updateTranscriptState(event.results[i]);
        }
    };

    recognition.onerror = handleRecognitionError;

    recognition.onend = () => {
        isRecognizing = false;
        skipNextError = false;

        const transcript = getSessionTranscript();
        if (transcript) {
            onResult?.(transcript);
        }

        // 每次识别结束都重置文本状态
        resetSessionText();

        if (isDestroyed) {
            return;
        }

        if (restartRecognitionIfNeeded()) {
            return;
        }

        onEnd?.();
    };

    return {
        isSupported: true,
        start() {
            if (isDestroyed) {
                return false;
            }

            shouldKeepListening = true;
            if (isRecognizing) {
                return true;
            }

            try {
                recognition.start();
                return true;
            } catch (error) {
                shouldKeepListening = false;
                onError?.(error);
                return false;
            }
        },
        stop() {
            shouldKeepListening = false;

            if (!isRecognizing) {
                return true;
            }

            try {
                skipNextError = true;
                recognition.stop();
                return true;
            } catch (error) {
                onError?.(error);
                return false;
            }
        },
        destroy() {
            isDestroyed = true;
            shouldKeepListening = false;
            recognition.onstart = null;
            recognition.onresult = null;
            recognition.onerror = null;
            recognition.onend = null;

            try {
                recognition.stop();
            } catch (error) {
                onError?.(error);
            }
        },
    };
}
