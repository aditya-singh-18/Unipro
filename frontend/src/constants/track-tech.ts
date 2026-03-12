// ===============================
// TRACK TYPES
// ===============================
export type Track =
  | 'AI'
  | 'ML'
  | 'DATA_SCIENCE'
  | 'WEB'
  | 'APP'
  | 'IOT'
  | 'CYBER'
  | 'CLOUD_DEVOPS'
  | 'BLOCKCHAIN'
  | 'AR_VR'
  | 'GAME_DEV'
  | 'ROBOTICS'
  | 'AUTOMATION_RPA'
  | 'UI_UX'
  | 'NETWORKING'
  | 'OTHER';

// ===============================
// TRACK OPTIONS (FOR DROPDOWN)
// ===============================
export const TRACK_OPTIONS: Track[] = [
  'AI',
  'ML',
  'DATA_SCIENCE',
  'WEB',
  'APP',
  'IOT',
  'CYBER',
  'CLOUD_DEVOPS',
  'BLOCKCHAIN',
  'AR_VR',
  'GAME_DEV',
  'ROBOTICS',
  'AUTOMATION_RPA',
  'UI_UX',
  'NETWORKING',
  'OTHER',
];

// ===============================
// TRACK → TECH STACK MAPPING
// ===============================
const BASE_TRACK_TECH_STACK: Record<Exclude<Track, 'OTHER'>, string[]> = {
  AI: [
    'Python',
    'TensorFlow',
    'PyTorch',
    'Keras',
    'OpenCV',
    'NLTK',
    'spaCy',
    'Hugging Face',
    'LangChain',
    'Rasa',
    'FastAPI',
    'Flask',
  ],

  ML: [
    'Python',
    'Scikit-learn',
    'XGBoost',
    'LightGBM',
    'Pandas',
    'NumPy',
    'Matplotlib',
    'Seaborn',
    'Jupyter',
    'MLflow',
  ],

  DATA_SCIENCE: [
    'Python',
    'R',
    'Pandas',
    'NumPy',
    'Tableau',
    'Power BI',
    'Excel',
    'SQL',
    'Apache Spark',
    'Hadoop',
    'Jupyter',
  ],

  WEB: [
    'HTML',
    'CSS',
    'JavaScript',
    'TypeScript',
    'React',
    'Next.js',
    'Angular',
    'Vue.js',
    'Node.js',
    'Express',
    'Django',
    'Flask',
    'Spring Boot',
    'PHP',
    'Laravel',
    'MySQL',
    'PostgreSQL',
    'MongoDB',
  ],

  APP: [
    'Android (Java)',
    'Kotlin',
    'Swift',
    'Flutter',
    'Dart',
    'React Native',
    'Xamarin',
    'Firebase',
    'Supabase',
  ],

  IOT: [
    'Arduino',
    'ESP8266',
    'ESP32',
    'Raspberry Pi',
    'Embedded C',
    'MicroPython',
    'NodeMCU',
    'MQTT',
    'Blynk',
    'ThingSpeak',
  ],

  CYBER: [
    'Kali Linux',
    'Metasploit',
    'Wireshark',
    'Burp Suite',
    'Nmap',
    'Snort',
    'OWASP',
    'SIEM',
    'SOC Tools',
    'Python',
    'Bash',
    'PowerShell',
  ],

  CLOUD_DEVOPS: [
    'AWS',
    'Azure',
    'GCP',
    'Docker',
    'Kubernetes',
    'Terraform',
    'Ansible',
    'Jenkins',
    'GitHub Actions',
    'CI/CD',
    'Linux',
    'Nginx',
  ],

  BLOCKCHAIN: [
    'Solidity',
    'Ethereum',
    'Web3.js',
    'Ethers.js',
    'Hardhat',
    'Truffle',
    'IPFS',
    'Polygon',
    'Rust',
    'Substrate',
  ],

  AR_VR: [
    'Unity',
    'Unreal Engine',
    'C#',
    'C++',
    'ARCore',
    'ARKit',
    'Vuforia',
    'Three.js',
    'WebXR',
  ],

  GAME_DEV: [
    'Unity',
    'Unreal Engine',
    'Godot',
    'C#',
    'C++',
    'Lua',
    'Blender',
    'Photon',
    'PlayFab',
  ],

  ROBOTICS: [
    'ROS',
    'ROS2',
    'Python',
    'C++',
    'Arduino',
    'Raspberry Pi',
    'Gazebo',
    'OpenCV',
    'SLAM',
  ],

  AUTOMATION_RPA: [
    'UiPath',
    'Automation Anywhere',
    'Blue Prism',
    'Python',
    'Selenium',
    'Playwright',
    'Power Automate',
  ],

  UI_UX: [
    'Figma',
    'Adobe XD',
    'Sketch',
    'Photoshop',
    'Illustrator',
    'Framer',
    'InVision',
  ],

  NETWORKING: [
    'Cisco Packet Tracer',
    'GNS3',
    'Wireshark',
    'TCP/IP',
    'Routing',
    'Switching',
    'Firewall',
    'VPN',
    'Linux Networking',
  ],
};

// Additional predefined entries used in mentor skills screen.
const EXTRA_TRACK_TECH_STACK: Partial<Record<Exclude<Track, 'OTHER'>, string[]>> = {
  AI: [
    'FastAI',
    'HuggingFace Transformers',
    'LlamaIndex',
    'OpenAI API',
    'Stable Diffusion',
    'Diffusers',
    'OpenVINO',
    'ONNX',
    'TensorRT',
    'OpenCV AI',
  ],
  ML: [
    'CatBoost',
    'SciPy',
    'Optuna',
    'PyCaret',
    'Statsmodels',
  ],
  DATA_SCIENCE: [
    'Jupyter Notebook',
    'JupyterLab',
    'Plotly',
    'Dask',
    'Apache Flink',
    'Airflow',
    'Superset',
    'Metabase',
  ],
  WEB: [
    'Svelte',
    'Tailwind CSS',
    'Bootstrap',
    'NestJS',
    'Express.js',
    'Ruby on Rails',
    'ASP.NET Core',
    'GraphQL',
    'REST API',
    'Supabase',
    'Firebase',
    'Redis',
  ],
  APP: [
    'Android Java',
    'Android Kotlin',
    'SwiftUI',
    'Ionic',
    'Expo',
    'Jetpack Compose',
    'Kotlin Multiplatform',
    'NativeScript',
    'Cordova',
    'Capacitor',
  ],
  IOT: [
    'Node-RED',
    'Home Assistant',
    'Azure IoT',
    'AWS IoT',
  ],
  CYBER: [
    'OWASP ZAP',
    'OpenVAS',
    'Hashcat',
    'YARA',
  ],
  CLOUD_DEVOPS: [
    'AWS Lambda',
    'AWS EC2',
    'AWS S3',
    'Google Cloud',
    'Google BigQuery',
    'Vercel',
    'Netlify',
    'Cloudflare Workers',
    'Docker Compose',
    'Helm',
    'GitLab CI/CD',
    'Prometheus',
    'Grafana',
    'ELK Stack',
    'Istio',
  ],
  BLOCKCHAIN: [
    'Hyperledger Fabric',
    'Polkadot',
    'Chainlink',
  ],
  AR_VR: [
    'Babylon.js',
  ],
  GAME_DEV: [
    'CryEngine',
    'GameMaker',
    'Phaser',
    'Pygame',
  ],
  ROBOTICS: [
    'FreeRTOS',
    'ARM Cortex',
    'STM32',
    'AVR',
    'Zephyr RTOS',
    'QNX',
  ],
};

const TRACK_KEYS = TRACK_OPTIONS.filter(
  (track): track is Exclude<Track, 'OTHER'> => track !== 'OTHER'
);

export const TRACK_TECH_STACK: Record<Exclude<Track, 'OTHER'>, string[]> =
  TRACK_KEYS.reduce((acc, track) => {
    acc[track] = Array.from(
      new Set([
        ...(BASE_TRACK_TECH_STACK[track] || []),
        ...(EXTRA_TRACK_TECH_STACK[track] || []),
      ])
    );
    return acc;
  }, {} as Record<Exclude<Track, 'OTHER'>, string[]>);
