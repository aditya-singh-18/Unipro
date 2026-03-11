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
export const TRACK_TECH_STACK: Record<Exclude<Track, 'OTHER'>, string[]> = {
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
