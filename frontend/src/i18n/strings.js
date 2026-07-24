// Bilingual copy deck. th/en ported from the CyberShield Claude Design mockup,
// extended with keys the mockup didn't cover but the real app needs
// (table columns, feature-grid presets, structured inputs).
export const STR = {
  th: {
    brand: "CyberShield",
    tagline: "ระบบพอร์ทัลความปลอดภัย & ข่าวกรองภัยคุกคามด้วย AI",
    defconSub: "ทุกภาคส่วนปลอดภัย",
    logout: "ออกจากระบบ",
    nav: { dashboard: "แดชบอร์ด", analytics: "การวิเคราะห์", incidents: "เหตุการณ์", logs: "บันทึกเหตุการณ์", manualTest: "ทดสอบด้วยตนเอง", settings: "ตั้งค่า" },
    login: {
      tabSignin: "เข้าสู่ระบบ", tabSignup: "สมัครสมาชิก",
      usernameLabel: "ชื่อผู้ใช้หรืออีเมล", usernamePh: "กรอกชื่อผู้ใช้หรืออีเมล", passwordLabel: "รหัสผ่าน", passwordPh: "กรอกรหัสผ่าน",
      submitSignin: "เข้าสู่ระบบ CyberShield",
      firstName: "ชื่อจริง", firstNamePh: "ชื่อจริง", lastName: "นามสกุล", lastNamePh: "นามสกุล",
      usernamePh2: "ต้องไม่ซ้ำ (อย่างน้อย 3 ตัวอักษร)", phone: "เบอร์โทรศัพท์", phonePh: "เช่น 081-234-5678",
      showPw: "แสดง", hidePw: "ซ่อน",
      email: "อีเมล", emailPh: "user@example.com",
      passwordPh2: "อย่างน้อย 6 ตัวอักษร", confirmPassword: "ยืนยันรหัสผ่าน", confirmPh: "กรอกรหัสผ่านอีกครั้ง",
      submitSignup: "สมัครสมาชิก", noAccountText: "ยังไม่มีบัญชี?", haveAccountText: "มีบัญชีอยู่แล้ว?",
      consentText: "ข้าพเจ้ารับทราบและยินยอมให้ CyberShield เก็บรวบรวมและประมวลผลข้อมูลการใช้งานของข้าพเจ้าเพื่อวัตถุประสงค์ด้านความปลอดภัยไซเบอร์",
      signupSuccessNotice: "สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านที่สมัครไว้",
      secureBadge: "พอร์ทัลเข้ารหัสปลอดภัย",
      footerNote: "สำหรับเจ้าหน้าที่ที่ได้รับอนุญาตและผู้ใช้ทั่วไปที่ลงทะเบียนแล้วเท่านั้น",
      adminHint: "บัญชีผู้ดูแล: admin / admin12345 หรือสมัครสมาชิกทั่วไป"
    },
    dash: {
      title: "ฟีดตรวจจับ SOC แบบสด & เรดาร์", subtitle: "เฝ้าระวังภัยคุกคามไซเบอร์แบบเรียลไทม์ด้วยโครงข่ายประสาทเทียม 3 ระบบ",
      radarStatus: "เรดาร์กำลังสแกน: ทุกภาคส่วนปลอดภัย", velocityTitle: "ความเร็วแพ็กเก็ตแบบสด", pktsUnit: "แพ็กเก็ต/วิ",
      statPacketBuffer: "บัฟเฟอร์แพ็กเก็ต", statModels: "โมเดล LSTM เชิงลึก", statSiren: "ระบบไซเรน", active: "ทำงาน",
      streamTitle: "สตรีมการพยากรณ์แบบสด", streamHint: "คลิกแถวเหตุการณ์เพื่อดูรายละเอียด",
      emptyTitle: "ไม่มีเหตุการณ์ในขณะนี้", emptySub: "เซนเซอร์ทุกจุดรายงานว่าปกติ",
      online: "สตรีมออนไลน์", reconnecting: "กำลังเชื่อมต่อใหม่..."
    },
    analytics: {
      title: "เมทริกซ์ข่าวกรองภัยคุกคาม & การวิเคราะห์", subtitle: "การกระจายประเภทภัยคุกคาม แผนที่ MITRE ATT&CK และค่าความหน่วงของโมเดล",
      range24h: "24 ชั่วโมง", range7d: "7 วัน", rangeAll: "ทั้งหมด", refresh: "รีเฟรชเมทริกซ์",
      spectrumTitle: "การกระจายประเภทการโจมตี", totalSampled: "รายการทั้งหมด",
      mitreTitle: "แผนที่ MITRE ATT&CK", colTactic: "กลยุทธ์", colTechnique: "เทคนิค", colDetected: "ประเภทที่ตรวจพบ", colSeverity: "ความรุนแรง",
      telemetryTitle: "ข้อมูลประสิทธิภาพโมเดล", online: "ออนไลน์",
      inputShape: "รูปแบบข้อมูลนำเข้า", validationAcc: "ความแม่นยำ", f1: "F1-Score", latency: "เวลาประมวลผลเฉลี่ย",
      demoNotice: "กำลังแสดงข้อมูลพื้นฐานจากสถิติย้อนหลัง เหตุการณ์จริงจะผสมเข้ามาอัตโนมัติ"
    },
    incidents: {
      title: "ศูนย์เหตุการณ์และการดำเนินการ", subtitle: "จัดลำดับความสำคัญ กักกันที่ไฟร์วอลล์ขอบเครือข่าย และบันทึกการดำเนินการ",
      statOpen: "แจ้งเตือนวิกฤตที่เปิดอยู่", statInvestigating: "อยู่ระหว่างตรวจสอบ", statMitigated: "แก้ไข/กักกันแล้ว",
      queueTitle: "คิวภัยคุกคามความเชื่อมั่นสูง", filterAll: "ทั้งหมด", filterOpen: "เปิดอยู่", filterInvestigating: "กำลังตรวจสอบ", filterMitigated: "แก้ไขแล้ว",
      emptyTitle: "ไม่พบเหตุการณ์ที่เข้าเงื่อนไข", emptySub: "เซนเซอร์ขอบเครือข่ายรายงานว่าปกติทั้งหมด",
      auditTitle: "บันทึกการดำเนินการของผู้ปฏิบัติงาน", auditEmpty: "ยังไม่มีการบันทึกการดำเนินการวันนี้",
      colRef: "รหัสอ้างอิง", colAttack: "ประเภทการโจมตี", colModel: "โมเดล", colConfidence: "ความเชื่อมั่น", colSource: "ไอพีต้นทาง", colTimestamp: "เวลา", colStatus: "สถานะ", colActions: "การดำเนินการ",
      actionTriage: "ตรวจสอบ", actionQuarantine: "กักกัน", actionInspect: "ตรวจดู", syncBtn: "ซิงค์คิวแจ้งเตือน"
    },
    logs: {
      title: "บันทึกเหตุการณ์ย้อนหลัง", subtitle: "ฐานข้อมูลค้นหาพร้อมตัวกรองขั้นสูงและส่งออกข้อมูล",
      exportCsv: "ส่งออก CSV", exportJson: "ส่งออก JSON", refresh: "รีเฟรช",
      searchPh: "ค้นหา IP, ประเภทการโจมตี หรือรหัสอ้างอิง...", modelFilterAll: "โมเดลทั้งหมด", classFilterAll: "ประเภทการโจมตีทั้งหมด",
      emptyTitle: "ไม่พบเหตุการณ์ย้อนหลัง", emptySub: "ลองปรับเงื่อนไขการค้นหาหรือตัวกรอง",
      colRef: "รหัสอ้างอิง", colModel: "โมเดล", colAttack: "ประเภทการโจมตี", colConfidence: "ความเชื่อมั่น", colSource: "ไอพีต้นทาง", colTimestamp: "เวลา", colAlert: "แจ้งเตือน",
      prevPage: "← หน้าก่อน", nextPage: "หน้าถัดไป →", pageLabel: "หน้า", alertsOnlyLabel: "แจ้งเตือนความสำคัญสูงเท่านั้น"
    },
    manual: {
      title: "แซนด์บ็อกซ์จำลองการโจมตีด้วยตนเอง", subtitle: "ป้อนข้อมูลตรงเข้าโมเดล LSTM ทั้ง 3 เพื่อทดสอบพฤติกรรมอย่างละเอียด",
      tabSql: "โมเดล SQL Injection", tabIntrusion: "โมเดลการบุกรุก (UNSW-NB15)", tabFlow: "โมเดลกระแสข้อมูล (CIC-IDS2018)",
      presetsLabel: "รูปแบบสำเร็จรูป:", presetBoolean: "Boolean Blind", presetStacked: "Stacked Query", presetUnion: "UNION Select", presetClean: "Clean Baseline",
      executeBtn: "ประมวลผลด้วยโมเดล", resultConfidence: "ความเชื่อมั่น", resultLatency: "เวลาประมวลผล",
      readOnlyNotice: "บัญชีทั่วไปดูผลได้อย่างเดียว ไม่สามารถแก้ไขหรือประมวลผลได้",
      presetR2l: "R2L Buffer Exploit", presetU2r: "U2R Root Escalation", presetNormal: "Normal Baseline",
      presetDdos: "SYN Flood DDoS", presetDos: "Slowloris DoS", presetPortscan: "PortScan Sweep", presetBenign: "BENIGN",
      resultThreat: "ตรวจพบภัยคุกคาม", resultSafe: "ทราฟฟิกปกติ", probSpectrum: "การกระจายความน่าจะเป็น (Softmax)"
    },
    settings: {
      title: "การตั้งค่า", subtitle: "จัดการโปรไฟล์ ภาษาและธีม เสียงแจ้งเตือน การแสดงผล และการกักกันของไฟร์วอลล์",
      audioCardTitle: "เสียงแจ้งเตือน", audioToggleLabel: "เปิดใช้งานไซเรนและเสียงบี๊บ", audioToggleDesc: "เล่นเสียงเมื่อพบการแจ้งเตือนความเชื่อมั่นสูง",
      volumeLabel: "ระดับเสียงหลัก", volumeDesc: "ปรับระดับเสียงเอาต์พุต",
      testSiren: "ทดสอบไซเรน", testPulse: "ทดสอบสัญญาณ DEFCON 1", testClick: "ทดสอบเสียงคลิก", testChime: "ทดสอบเสียงสำเร็จ",
      displayCardTitle: "การแสดงผลและข้อมูล", densityLabel: "โหมดตารางแบบกระชับ", densityDesc: "ลดระยะห่างเพื่อแสดงข้อมูลได้มากขึ้นต่อหน้าจอ",
      refreshLabel: "ความถี่การรีเฟรชอัตโนมัติ", refreshDesc: "ความถี่ในการอัปเดตข้อมูลย้อนหลังและตารางสถิติ",
      every5: "ทุก 5 วินาที", every10: "ทุก 10 วินาที (มาตรฐาน)", every30: "ทุก 30 วินาที", every60: "ทุก 60 วินาที",
      on: "เปิด", off: "ปิด",
      firewallTitle: "รายการ IP ที่ถูกกักกันโดยไฟร์วอลล์ขอบเครือข่าย", addBlockBtn: "จำลองการบล็อก", unblockBtn: "ปลดบล็อก", firewallEmpty: "ไม่มี IP ที่ถูกกักกัน",
      languageLabel: "ภาษา", languageDesc: "เลือกภาษาที่ใช้แสดงผลทั้งระบบ",
      themeLabel: "ธีมการแสดงผล", themeDesc: "สลับระหว่างโหมดสว่างและโหมดมืด", themeLight: "โหมดสว่าง", themeDark: "โหมดมืด",
      roleCardTitle: "บทบาทและมุมมอง", roleLabel: "มุมมองปัจจุบัน", roleDesc: "สลับไปดูหน้าจอในมุมมองบุคคลทั่วไป (อ่านอย่างเดียว)",
      roleAdminOpt: "ผู้ดูแล", roleGeneralOpt: "บุคคลทั่วไป",
      catGeneral: "ทั่วไป", catAudio: "เสียงแจ้งเตือน", catDisplay: "การแสดงผล", catRole: "บทบาทและมุมมอง", catFirewall: "ไฟร์วอลล์", catProfile: "โปรไฟล์",
      previewBannerText: "กำลังดูในมุมมองบุคคลทั่วไป — ใช้งานได้ทุกส่วนแต่ปรับแก้ไม่ได้", previewBackBtn: "กลับสู่มุมมองผู้ดูแล",
      usageCardTitle: "ข้อมูลการใช้งานของบุคคลทั่วไป", usageActiveUsers: "ผู้ใช้ทั่วไปที่ใช้งานอยู่", usageSignups: "สมัครสมาชิกวันนี้", usageSessions: "เซสชันวันนี้", usageAvgSession: "เวลาเฉลี่ยต่อเซสชัน",
      profileCardTitle: "ข้อมูลส่วนตัว", profileSaveBtn: "บันทึกการเปลี่ยนแปลง", profileSavedTag: "บันทึกแล้ว",
      resetPwTitle: "รีเซ็ตรหัสผ่าน", currentPwLabel: "รหัสผ่านปัจจุบัน", newPwLabel: "รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)",
      pwMismatchError: "รหัสผ่านใหม่ไม่ตรงกัน หรือสั้นกว่า 8 ตัวอักษร", resetPwBtn: "รีเซ็ตรหัสผ่าน",
      pwNotConnected: "ฟีเจอร์นี้ยังไม่เชื่อมต่อกับเซิร์ฟเวอร์ — ยังไม่สามารถเปลี่ยนรหัสผ่านจริงได้ในขณะนี้"
    }
  },
  en: {
    brand: "CyberShield",
    tagline: "Security Portal & AI Threat Intelligence",
    defconSub: "All sectors secure",
    logout: "Log out",
    nav: { dashboard: "Dashboard", analytics: "Analytics", incidents: "Incidents", logs: "Logs", manualTest: "Manual Test", settings: "Settings" },
    login: {
      tabSignin: "Sign In", tabSignup: "Sign Up",
      usernameLabel: "Username or Email", usernamePh: "Enter username or email", passwordLabel: "Password", passwordPh: "Enter your password",
      submitSignin: "Sign In to CyberShield",
      firstName: "First Name", firstNamePh: "First name", lastName: "Last Name", lastNamePh: "Last name",
      usernamePh2: "Must be unique (min 3 characters)", phone: "Phone Number", phonePh: "e.g. 081-234-5678",
      showPw: "Show", hidePw: "Hide",
      email: "Email Address", emailPh: "user@example.com",
      passwordPh2: "Min 6 characters", confirmPassword: "Confirm Password", confirmPh: "Re-enter password",
      submitSignup: "Sign Up", noAccountText: "Don't have an account?", haveAccountText: "Already have an account?",
      consentText: "I agree and consent to CyberShield collecting and processing my usage data for security operations purposes.",
      signupSuccessNotice: "Account created. Please sign in with your new username and password.",
      secureBadge: "Secure Encrypted Portal",
      footerNote: "Authorized security personnel and registered general users only.",
      adminHint: "Admin account: admin / admin12345, or register a general account"
    },
    dash: {
      title: "Live SOC Detection Feed & Radar", subtitle: "Real-time cyber threat monitoring powered by 3 deep learning networks",
      radarStatus: "Radar scanning: all sectors clear", velocityTitle: "Live Packet Velocity", pktsUnit: "pkts/s",
      statPacketBuffer: "Packet Buffer", statModels: "Deep LSTM Models", statSiren: "Siren System", active: "active",
      streamTitle: "Live Prediction Stream", streamHint: "Click a row to inspect",
      emptyTitle: "No events right now", emptySub: "All edge sensors report clean traffic",
      online: "Stream online", reconnecting: "Reconnecting..."
    },
    analytics: {
      title: "Threat Intelligence & Analytics Matrix", subtitle: "Attack classification distribution, MITRE ATT&CK mapping, and model latency telemetry",
      range24h: "24 Hours", range7d: "7 Days", rangeAll: "All Time", refresh: "Refresh Matrix",
      spectrumTitle: "Attack Spectrum Distribution", totalSampled: "total sampled",
      mitreTitle: "MITRE ATT&CK Framework Mapping", colTactic: "Tactic & ID", colTechnique: "Technique", colDetected: "Detected Class", colSeverity: "Severity",
      telemetryTitle: "Neural Engine Telemetry", online: "Online",
      inputShape: "Input Shape", validationAcc: "Validation Acc", f1: "F1-Score", latency: "Avg Inference Time",
      demoNotice: "Showing baseline historical distributions. Live events will blend in automatically as packets arrive."
    },
    incidents: {
      title: "Active Incidents & Action Center", subtitle: "Real-time triage, edge firewall containment, and audit trail for high-confidence alerts",
      statOpen: "Open Critical Alerts", statInvestigating: "Under Investigation", statMitigated: "Mitigated / Quarantined",
      queueTitle: "High-Confidence Threat Queue", filterAll: "All", filterOpen: "Open", filterInvestigating: "Investigating", filterMitigated: "Mitigated",
      emptyTitle: "No active incidents found", emptySub: "All edge sensors reporting clean traffic within thresholds",
      auditTitle: "Operator Action Audit Trail", auditEmpty: "No operator actions logged yet today.",
      colRef: "Ref ID", colAttack: "Attack Class", colModel: "Model", colConfidence: "Confidence", colSource: "Source IP", colTimestamp: "Timestamp", colStatus: "Status", colActions: "Containment Actions",
      actionTriage: "Triage", actionQuarantine: "Quarantine", actionInspect: "Inspect", syncBtn: "Sync Alert Queue"
    },
    logs: {
      title: "Historical Threat & Event Logs", subtitle: "Searchable prediction database with advanced filtering and exports",
      exportCsv: "Export CSV", exportJson: "Export JSON", refresh: "Refresh",
      searchPh: "Search IP, attack class, or ref ID...", modelFilterAll: "All Neural Models", classFilterAll: "All Attack Classes",
      emptyTitle: "No historical events found", emptySub: "Try adjusting your search criteria or filters",
      colRef: "Ref ID", colModel: "Model", colAttack: "Attack Class", colConfidence: "Confidence", colSource: "Source IP", colTimestamp: "Timestamp", colAlert: "Alert",
      prevPage: "← Prev Page", nextPage: "Next Page →", pageLabel: "Page", alertsOnlyLabel: "High-priority alerts only"
    },
    manual: {
      title: "Neural Sandbox & Manual Attack Simulation", subtitle: "Inject crafted payloads directly into the 3 deep LSTM models for precision testing",
      tabSql: "SQL Injection Model", tabIntrusion: "Intrusion LSTM (UNSW-NB15)", tabFlow: "Flow LSTM (CIC-IDS2018)",
      presetsLabel: "Attack presets:", presetBoolean: "Boolean Blind", presetStacked: "Stacked Query", presetUnion: "UNION Select", presetClean: "Clean Baseline",
      executeBtn: "Execute Model Inference", resultConfidence: "Confidence", resultLatency: "Latency",
      readOnlyNotice: "General accounts can view results only — testing is admin-only.",
      presetR2l: "R2L Buffer Exploit", presetU2r: "U2R Root Escalation", presetNormal: "Normal Baseline",
      presetDdos: "SYN Flood DDoS", presetDos: "Slowloris DoS", presetPortscan: "PortScan Sweep", presetBenign: "BENIGN",
      resultThreat: "Threat Detected", resultSafe: "Benign Traffic Confirmed", probSpectrum: "Softmax Class Probability Spectrum"
    },
    settings: {
      title: "Settings", subtitle: "Manage your profile, language and theme, alerts, display, and firewall quarantine",
      audioCardTitle: "Audio Alerts", audioToggleLabel: "Enable siren & HUD beeps", audioToggleDesc: "Plays a sound when a high-confidence alert occurs",
      volumeLabel: "Master Volume", volumeDesc: "Adjust output gain level",
      testSiren: "Test Alert Siren", testPulse: "Test DEFCON 1 Pulse", testClick: "Test HUD Click", testChime: "Test Success Chime",
      displayCardTitle: "Display & Data", densityLabel: "Compact Table Mode", densityDesc: "Condense padding to fit more rows per screen",
      refreshLabel: "Auto-Refresh Interval", refreshDesc: "Polling frequency for historical logs and stat tables",
      every5: "Every 5 seconds", every10: "Every 10 seconds (Standard)", every30: "Every 30 seconds", every60: "Every 60 seconds",
      on: "On", off: "Off",
      firewallTitle: "Edge Firewall Quarantined IP List", addBlockBtn: "Simulate Edge Block", unblockBtn: "Unblock", firewallEmpty: "No IPs currently quarantined",
      languageLabel: "Language", languageDesc: "Choose the display language for the whole app",
      themeLabel: "Display Theme", themeDesc: "Switch between light and dark mode", themeLight: "Light Mode", themeDark: "Dark Mode",
      roleCardTitle: "Role & Preview", roleLabel: "Current View", roleDesc: "Switch to a read-only preview of the general public view",
      roleAdminOpt: "Admin", roleGeneralOpt: "General",
      catGeneral: "General", catAudio: "Audio Alerts", catDisplay: "Display & Data", catRole: "Role & Preview", catFirewall: "Firewall", catProfile: "Profile",
      previewBannerText: "Previewing as a general user — everything is viewable but nothing can be changed", previewBackBtn: "Back to Admin View",
      usageCardTitle: "General User Activity", usageActiveUsers: "Active General Users", usageSignups: "Sign-ups Today", usageSessions: "Sessions Today", usageAvgSession: "Avg. Session Time",
      profileCardTitle: "Personal Information", profileSaveBtn: "Save Changes", profileSavedTag: "Saved",
      resetPwTitle: "Reset Password", currentPwLabel: "Current Password", newPwLabel: "New Password (min 8 characters)",
      pwMismatchError: "New passwords don't match, or are shorter than 8 characters", resetPwBtn: "Reset Password",
      pwNotConnected: "Not yet connected to the backend — real password changes aren't available here yet."
    }
  }
};

export default STR;
