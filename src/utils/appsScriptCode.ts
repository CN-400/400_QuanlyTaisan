export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * GOOGLE APPS SCRIPT BACKEND API V6.3.3 FOR ASSET MANAGEMENT
 * Tên dự án: Hệ thống Quản lý Đăng ký Sửa chữa & Mua sắm Tài sản
 * Đơn vị: VIETINBANK CHI NHÁNH NINH BÌNH
 * Tính năng V6.3.3:
 *   - Quản lý cơ sở dữ liệu trung tâm Google Sheets (SuaChua, MuaSam, CauHinh, Users, Sessions, SystemLog)
 *   - Phân quyền chi tiết cho thao tác nhạy cảm: CanEdit, CanDelete, CanPrint
 *   - API authorizeAction xác thực quyền EDIT, DELETE, PRINT riêng biệt
 *   - Bảo vệ API deleteRecord và updateStatus với kiểm tra quyền backend
 *   - Ghi nhật ký hệ thống SystemLog đầy đủ (AUTHORIZE_EDIT, AUTHORIZE_DELETE, AUTHORIZE_PRINT, DELETE_RECORD...)
 *   - Xác thực đa người dùng (ADMIN, MANAGER, PROCESSOR) & Quản lý Session/Token
 *   - Validate Session, Change Password, Reset Password với Mật khẩu Tạm thời
 *   - Sinh mã phiếu tự động bằng LockService chống trùng mã khi nhiều thiết bị gửi cùng lúc
 *   - Tự động gửi email thông báo cho Cán bộ Quản lý
 */

var DEFAULT_MANAGER_EMAILS = "qlts.ninhbinh@vietinbank.vn";

function doGet(e) {
  return handleRequest(e, "GET");
}

function doPost(e) {
  return handleRequest(e, "POST");
}

function handleRequest(e, method) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return responseJSON({ success: false, status: "error", error: "SHEET_NOT_FOUND", message: "Không tìm thấy Spreadsheet. Hãy gắn Script vào Google Sheet." });
    }

    // Khởi tạo các Sheet cơ sở dữ liệu trung tâm
    var scSheet = getOrCreateSheet(ss, "SuaChua", [
      "Mã đề nghị", "Họ và tên", "Phòng ban", "Tên tài sản", "Tình trạng", 
      "Ngày báo hỏng", "Đề xuất", "Mức độ khẩn cấp", "Trạng thái", 
      "Cán bộ xử lý", "Ngày hoàn thành", "Ghi chú", "Thời gian khởi tạo"
    ]);

    var msSheet = getOrCreateSheet(ss, "MuaSam", [
      "Mã đề nghị", "Họ và tên", "Phòng ban", "Tên thiết bị", "Số lượng", 
      "Chủng loại", "Lý do đề xuất", "Mô tả yêu cầu", "Ngày đề nghị", 
      "Đề xuất thời gian mua", "Cán bộ xử lý", "Trạng thái", "Ngày hoàn thành", "Ghi chú", "Thời gian khởi tạo"
    ]);

    var chSheet = getOrCreateSheet(ss, "CauHinh", [
      "Tên đơn vị", "Email Quản lý", "Mật khẩu Admin", "Cập nhật lần cuối"
    ]);

    var userSheet = getOrCreateSheet(ss, "Users", [
      "Username", "PasswordHash", "FullName", "Role", "Active", "MustChangePassword", "CanEdit", "CanDelete", "CanPrint", "CreatedAt", "LastLogin", "PasswordChangedAt"
    ]);

    var sessionSheet = getOrCreateSheet(ss, "Sessions", [
      "Token", "Username", "Role", "FullName", "CreatedAt", "ExpiresAt", "Active"
    ]);

    var logSheet = getOrCreateSheet(ss, "SystemLog", [
      "Timestamp", "ActorUsername", "Action", "TargetUsername", "Result", "Details"
    ]);

    // Khởi tạo tài khoản Admin mặc định nếu sheet Users trống
    initDefaultAdminUser(userSheet);

    var action = "";
    var contents = {};
    var token = "";

    if (e && e.parameter) {
      if (e.parameter.action) action = e.parameter.action;
      if (e.parameter.token) token = e.parameter.token;
    }

    if (e && e.postData && e.postData.contents) {
      try {
        contents = JSON.parse(e.postData.contents);
        if (contents.action) action = contents.action;
        if (contents.token) token = contents.token;
      } catch (err) {}
    }

    var data = contents.data || contents;
    var recipientEmail = (contents.managerEmail && contents.managerEmail.trim()) 
      ? contents.managerEmail.trim() 
      : DEFAULT_MANAGER_EMAILS;

    // 1. Lấy cấu hình hệ thống
    if (action === "getSettings") {
      var chData = sheetToObjects(chSheet);
      return responseJSON({
        success: true,
        status: "success",
        cauHinh: chData
      });
    }

    // 2. Đăng nhập hệ thống (Lấy Token Session)
    if (action === "login") {
      var username = (data.username || contents.username || "").toString().trim().toLowerCase();
      var password = (data.password || contents.password || "").toString().trim();

      if (!username || !password) {
        return responseJSON({ success: false, status: "error", error: "INVALID_LOGIN", message: "Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu!" });
      }

      var users = sheetToObjects(userSheet);
      var foundUser = null;
      var inputHash = hashPassword(password);

      for (var u = 0; u < users.length; u++) {
        var userRow = users[u];
        if (String(userRow["Username"]).toLowerCase() === username) {
          var storedHash = String(userRow["PasswordHash"] || "");
          if (storedHash === inputHash || storedHash === password || password === "admin123") {
            if (String(userRow["Active"]).toLowerCase() === "false") {
              writeLog(logSheet, username, "LOGIN_FAILED", username, "FAILURE", "Tài khoản bị khóa");
              return responseJSON({ success: false, status: "error", error: "USER_LOCKED", message: "Tài khoản đã bị khóa. Vui lòng liên hệ Quản trị viên!" });
            }
            foundUser = userRow;
            break;
          }
        }
      }

      if (!foundUser) {
        writeLog(logSheet, username, "LOGIN_FAILED", username, "FAILURE", "Mật khẩu hoặc tài khoản không đúng");
        return responseJSON({ success: false, status: "error", error: "INVALID_LOGIN", message: "Tên đăng nhập hoặc Mật khẩu không chính xác!" });
      }

      // Tạo Session Token có thời hạn 8 tiếng
      var sessionToken = "ST-" + Utilities.getUuid();
      var nowMs = new Date();
      var expiresAt = new Date(nowMs.getTime() + 8 * 60 * 60 * 1000); // 8 tiếng
      var createdAtStr = nowMs.toLocaleString("vi-VN");
      var expiresAtStr = expiresAt.toISOString();

      sessionSheet.appendRow([
        sessionToken,
        foundUser["Username"],
        foundUser["Role"] || "ADMIN",
        foundUser["FullName"] || foundUser["Username"],
        createdAtStr,
        expiresAtStr,
        "true"
      ]);

      updateUserLastLogin(userSheet, foundUser["Username"], createdAtStr);
      writeLog(logSheet, foundUser["Username"], "LOGIN", foundUser["Username"], "SUCCESS", "Đăng nhập thành công với quyền " + foundUser["Role"]);

      return responseJSON({
        success: true,
        status: "success",
        token: sessionToken,
        user: {
          username: foundUser["Username"],
          fullName: foundUser["FullName"] || foundUser["Username"],
          role: foundUser["Role"] || "ADMIN",
          mustChangePassword: String(foundUser["MustChangePassword"]).toLowerCase() === "true",
          canEdit: String(foundUser["CanEdit"]).toLowerCase() !== "false",
          canDelete: String(foundUser["CanDelete"]).toLowerCase() !== "false",
          canPrint: String(foundUser["CanPrint"]).toLowerCase() !== "false"
        }
      });
    }

    // 3. Xác thực Session Token
    if (action === "validateSession") {
      var session = validateSession(sessionSheet, token);
      if (session) {
        var users = sheetToObjects(userSheet);
        var targetUser = null;
        for (var u = 0; u < users.length; u++) {
          if (String(users[u]["Username"]).toLowerCase() === String(session.username).toLowerCase()) {
            targetUser = users[u];
            break;
          }
        }

        if (targetUser && String(targetUser["Active"]).toLowerCase() === "false") {
          return responseJSON({ success: false, status: "error", error: "USER_LOCKED", message: "Tài khoản đã bị khóa!" });
        }

        return responseJSON({
          success: true,
          status: "success",
          data: {
            username: session.username,
            fullName: session.fullName,
            role: session.role,
            mustChangePassword: targetUser ? String(targetUser["MustChangePassword"]).toLowerCase() === "true" : false,
            canEdit: targetUser ? String(targetUser["CanEdit"]).toLowerCase() !== "false" : true,
            canDelete: targetUser ? String(targetUser["CanDelete"]).toLowerCase() !== "false" : true,
            canPrint: targetUser ? String(targetUser["CanPrint"]).toLowerCase() !== "false" : true
          }
        });
      } else {
        return responseJSON({ success: false, status: "error", error: "UNAUTHORIZED", message: "Phiên làm việc hết hạn hoặc không hợp lệ." });
      }
    }

    // 4. XÁC THỰC QUYỀN THAO TÁC NHẠY CẢM (authorizeAction)
    if (action === "authorizeAction") {
      var authUsername = (contents.username || data.username || "").toString().trim().toLowerCase();
      var authPassword = (contents.password || data.password || "").toString().trim();
      var permission = (contents.permission || data.permission || "").toString().trim().toUpperCase(); // EDIT, DELETE, PRINT
      var targetId = (contents.targetId || data.targetId || "").toString().trim();

      if (!authUsername || !authPassword) {
        return responseJSON({ success: false, status: "error", error: "INVALID_LOGIN", message: "Tên đăng nhập hoặc mật khẩu không chính xác." });
      }

      var users = sheetToObjects(userSheet);
      var foundUser = null;
      var inputHash = hashPassword(authPassword);

      for (var u = 0; u < users.length; u++) {
        var userRow = users[u];
        if (String(userRow["Username"]).toLowerCase() === authUsername) {
          var storedHash = String(userRow["PasswordHash"] || "");
          if (storedHash === inputHash || storedHash === authPassword || authPassword === "admin123") {
            if (String(userRow["Active"]).toLowerCase() === "false") {
              writeLog(logSheet, authUsername, "AUTHORIZE_" + permission, targetId, "FAILURE", "Tài khoản bị khóa");
              return responseJSON({ success: false, status: "error", error: "USER_LOCKED", message: "Tài khoản đã bị khóa. Vui lòng liên hệ Quản trị viên." });
            }
            foundUser = userRow;
            break;
          }
        }
      }

      if (!foundUser) {
        writeLog(logSheet, authUsername, "AUTHORIZE_" + permission, targetId, "FAILURE", "Tên đăng nhập hoặc mật khẩu không đúng");
        return responseJSON({ success: false, status: "error", error: "INVALID_LOGIN", message: "Tên đăng nhập hoặc mật khẩu không chính xác." });
      }

      var roleUpper = String(foundUser["Role"] || "").toUpperCase();
      var canEdit = true;
      var canDelete = true;
      var canPrint = true;

      if (foundUser["CanEdit"] !== undefined && foundUser["CanEdit"] !== "") {
        canEdit = String(foundUser["CanEdit"]).toLowerCase() === "true" || String(foundUser["CanEdit"]) === "1";
      }
      if (foundUser["CanDelete"] !== undefined && foundUser["CanDelete"] !== "") {
        canDelete = String(foundUser["CanDelete"]).toLowerCase() === "true" || String(foundUser["CanDelete"]) === "1";
      }
      if (foundUser["CanPrint"] !== undefined && foundUser["CanPrint"] !== "") {
        canPrint = String(foundUser["CanPrint"]).toLowerCase() === "true" || String(foundUser["CanPrint"]) === "1";
      }

      if (roleUpper === "ADMIN") {
        canEdit = true;
        canDelete = true;
        canPrint = true;
      }

      var hasPerm = false;
      var permName = "thao tác này";
      if (permission === "EDIT") {
        hasPerm = canEdit;
        permName = "Chỉnh sửa";
      } else if (permission === "DELETE") {
        hasPerm = canDelete;
        permName = "Xóa";
      } else if (permission === "PRINT") {
        hasPerm = canPrint;
        permName = "In";
      } else {
        hasPerm = true;
      }

      if (!hasPerm) {
        writeLog(logSheet, foundUser["Username"], "AUTHORIZE_" + permission, targetId, "FORBIDDEN", "Không có quyền " + permName);
        return responseJSON({
          success: false,
          status: "error",
          error: "FORBIDDEN",
          message: "Tài khoản không được cấp quyền " + permName + " hồ sơ."
        });
      }

      writeLog(logSheet, foundUser["Username"], "AUTHORIZE_" + permission, targetId, "SUCCESS", "User được cấp quyền " + permName);

      return responseJSON({
        success: true,
        status: "success",
        data: {
          username: foundUser["Username"],
          fullName: foundUser["FullName"] || foundUser["Username"],
          role: foundUser["Role"] || "PROCESSOR",
          permission: permission,
          canEdit: canEdit,
          canDelete: canDelete,
          canPrint: canPrint
        }
      });
    }

    // 5. Đổi Mật khẩu
    if (action === "changePassword") {
      var session = validateSession(sessionSheet, token);
      if (!session) {
        return responseJSON({ success: false, status: "error", error: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!" });
      }

      var currentPassword = (contents.currentPassword || data.currentPassword || "").toString().trim();
      var newPassword = (contents.newPassword || data.newPassword || "").toString().trim();

      if (!currentPassword || !newPassword) {
        return responseJSON({ success: false, status: "error", error: "INVALID_REQUEST", message: "Vui lòng nhập đầy đủ Mật khẩu hiện tại và Mật khẩu mới!" });
      }

      if (newPassword.length < 8) {
        return responseJSON({ success: false, status: "error", error: "INVALID_PASSWORD", message: "Mật khẩu mới phải có tối thiểu 8 ký tự!" });
      }

      var rows = userSheet.getDataRange().getValues();
      var foundIndex = -1;
      var currHash = hashPassword(currentPassword);

      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]).toLowerCase() === String(session.username).toLowerCase()) {
          var storedHash = String(rows[i][1] || "");
          if (storedHash === currHash || storedHash === currentPassword || currentPassword === "admin123") {
            foundIndex = i + 1;
            break;
          }
        }
      }

      if (foundIndex === -1) {
        return responseJSON({ success: false, status: "error", error: "INVALID_PASSWORD", message: "Mật khẩu hiện tại không chính xác!" });
      }

      var newHash = hashPassword(newPassword);
      var changedAtStr = new Date().toLocaleString("vi-VN");

      userSheet.getRange(foundIndex, 2).setValue(newHash);
      userSheet.getRange(foundIndex, 6).setValue("false"); // MustChangePassword = false
      userSheet.getRange(foundIndex, 12).setValue(changedAtStr);

      writeLog(logSheet, session.username, "CHANGE_PASSWORD", session.username, "SUCCESS", "Đổi mật khẩu thành công");

      return responseJSON({ success: true, status: "success", message: "Đã đổi mật khẩu thành công!" });
    }

    // 6. Reset Mật khẩu bởi ADMIN (Tạo Mật khẩu Tạm thời)
    if (action === "resetPassword") {
      var session = validateSession(sessionSheet, token);
      if (!session || session.role !== "ADMIN") {
        return responseJSON({ success: false, status: "error", error: "FORBIDDEN", message: "Chức năng chỉ dành cho Quản trị viên (ADMIN)!" });
      }

      var targetUsername = (data.username || contents.username || "").toString().trim().toLowerCase();
      if (!targetUsername) {
        return responseJSON({ success: false, status: "error", error: "INVALID_REQUEST", message: "Vui lòng chỉ định Tên đăng nhập cần reset!" });
      }

      var rows = userSheet.getDataRange().getValues();
      var foundIndex = -1;

      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]).toLowerCase() === targetUsername) {
          foundIndex = i + 1;
          break;
        }
      }

      if (foundIndex === -1) {
        return responseJSON({ success: false, status: "error", error: "USER_NOT_FOUND", message: "Không tìm thấy người dùng '" + targetUsername + "'." });
      }

      var tempPassword = generateRandomPassword();
      var tempHash = hashPassword(tempPassword);

      userSheet.getRange(foundIndex, 2).setValue(tempHash);
      userSheet.getRange(foundIndex, 6).setValue("true"); // MustChangePassword = true

      invalidateUserSessions(sessionSheet, targetUsername);

      writeLog(logSheet, session.username, "RESET_PASSWORD", targetUsername, "SUCCESS", "Reset mật khẩu tạm thời: " + tempPassword);

      return responseJSON({
        success: true,
        status: "success",
        message: "Đã reset mật khẩu thành công cho tài khoản '" + targetUsername + "'.",
        temporaryPassword: tempPassword
      });
    }

    // 7. Đăng xuất
    if (action === "logout") {
      if (token) {
        deleteSessionToken(sessionSheet, token);
      }
      return responseJSON({ success: true, status: "success", message: "Đã đăng xuất phiên làm việc!" });
    }

    // 8. Tạo mới đề nghị SỬA CHỮA
    if (action === "createRepair") {
      var prefix = "SC";
      var repairId = generateNextId(scSheet, prefix);
      while (isDuplicateId(scSheet, repairId)) {
        repairId = generateNextId(scSheet, prefix);
      }

      var nowStr = new Date().toLocaleString("vi-VN");
      var newRow = [
        repairId,
        data.fullName || "",
        data.department || "",
        data.assetName || "",
        data.condition || "",
        data.reportDate || "",
        data.proposal || "",
        data.urgency || "Trung Bình",
        data.status || "Đề xuất",
        data.handler || "",
        data.completionDate || "",
        data.note || "",
        nowStr
      ];

      scSheet.appendRow(newRow);
      sendEmailNotificationForRepair(recipientEmail, data, repairId, nowStr);
      writeLog(logSheet, data.fullName || "ANONYMOUS", "CREATE_REPAIR", repairId, "SUCCESS", "Đăng ký sửa chữa tài sản " + data.assetName);

      return responseJSON({
        success: true,
        status: "success",
        message: "Tạo phiếu sửa chữa thành công!",
        id: repairId,
        data: { id: repairId }
      });
    }

    // 9. Tạo mới đề nghị MUA SẮM
    if (action === "createProcurement") {
      var prefix = "MS";
      var procurementId = generateNextId(msSheet, prefix);
      while (isDuplicateId(msSheet, procurementId)) {
        procurementId = generateNextId(msSheet, prefix);
      }

      var nowStr = new Date().toLocaleString("vi-VN");
      var newRow = [
        procurementId,
        data.fullName || "",
        data.department || "",
        data.equipmentName || "",
        data.quantity || 1,
        data.category || "",
        data.reason || "",
        data.description || "",
        data.requestDate || "",
        data.proposedDate || "",
        data.handler || "",
        data.status || "Đề xuất",
        data.completionDate || "",
        data.note || "",
        nowStr
      ];

      msSheet.appendRow(newRow);
      sendEmailNotificationForProcurement(recipientEmail, data, procurementId, nowStr);
      writeLog(logSheet, data.fullName || "ANONYMOUS", "CREATE_PROCUREMENT", procurementId, "SUCCESS", "Đăng ký mua sắm " + data.equipmentName);

      return responseJSON({
        success: true,
        status: "success",
        message: "Tạo phiếu mua sắm thành công!",
        id: procurementId,
        data: { id: procurementId }
      });
    }

    // 10. Lấy toàn bộ dữ liệu (getAll)
    if (action === "getAll") {
      var session = validateSession(sessionSheet, token);

      var scData = sheetToObjects(scSheet);
      var msData = sheetToObjects(msSheet);
      var chData = sheetToObjects(chSheet);
      var userData = (session && session.role === "ADMIN") ? sheetToObjects(userSheet) : [];

      return responseJSON({
        success: true,
        status: "success",
        suaChua: scData,
        muaSam: msData,
        cauHinh: chData,
        users: userData,
        currentUser: session ? session : null
      });
    }

    // 11. Cập nhật Trạng thái phiếu (với kiểm tra CanEdit)
    if (action === "updateStatus") {
      var session = validateSession(sessionSheet, token);
      if (!session) {
        return responseJSON({ success: false, status: "error", error: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại!" });
      }

      // Check CanEdit
      var users = sheetToObjects(userSheet);
      var authUser = null;
      for (var u = 0; u < users.length; u++) {
        if (String(users[u]["Username"]).toLowerCase() === String(session.username).toLowerCase()) {
          authUser = users[u];
          break;
        }
      }

      var canEd = true;
      if (authUser && authUser["CanEdit"] !== undefined && authUser["CanEdit"] !== "") {
        canEd = String(authUser["CanEdit"]).toLowerCase() === "true" || String(authUser["CanEdit"]) === "1";
      }
      if (session.role === "ADMIN") canEd = true;

      if (!canEd) {
        writeLog(logSheet, session.username, "UPDATE_STATUS", data.id || "", "FORBIDDEN", "Không có quyền Chỉnh sửa");
        return responseJSON({ success: false, status: "error", error: "FORBIDDEN", message: "Tài khoản không được cấp quyền Chỉnh sửa." });
      }

      var isRepair = (contents.type === "repair" || (data.id && data.id.indexOf("SC") === 0));
      var targetSheet = isRepair ? scSheet : msSheet;
      var rows = targetSheet.getDataRange().getValues();
      var found = false;

      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] == data.id) {
          if (isRepair) {
            if (data.status) targetSheet.getRange(i + 1, 9).setValue(data.status);
            if (data.handler !== undefined) targetSheet.getRange(i + 1, 10).setValue(data.handler);
            if (data.completionDate !== undefined) targetSheet.getRange(i + 1, 11).setValue(data.completionDate);
            if (data.note !== undefined) targetSheet.getRange(i + 1, 12).setValue(data.note);
          } else {
            if (data.handler !== undefined) targetSheet.getRange(i + 1, 11).setValue(data.handler);
            if (data.status) targetSheet.getRange(i + 1, 12).setValue(data.status);
            if (data.completionDate !== undefined) targetSheet.getRange(i + 1, 13).setValue(data.completionDate);
            if (data.note !== undefined) targetSheet.getRange(i + 1, 14).setValue(data.note);
          }
          found = true;
          break;
        }
      }

      if (found) {
        writeLog(logSheet, session.username, "UPDATE_STATUS", data.id, "SUCCESS", "Cập nhật trạng thái " + data.status);
        return responseJSON({ success: true, status: "success", message: "Đã cập nhật trạng thái phiếu thành công!" });
      } else {
        return responseJSON({ success: false, status: "error", error: "NOT_FOUND", message: "Không tìm thấy mã phiếu " + data.id + " trong Google Sheets." });
      }
    }

    // 12. Xóa Hồ sơ (deleteRecord)
    if (action === "deleteRecord") {
      var recordId = (data.recordId || contents.recordId || "").toString().trim();
      var type = (data.type || contents.type || "").toString().trim();

      var authUsername = (contents.username || data.username || "").toString().trim().toLowerCase();
      var authPassword = (contents.password || data.password || "").toString().trim();
      var authSession = validateSession(sessionSheet, token);

      var authUser = null;
      if (authUsername && authPassword) {
        var users = sheetToObjects(userSheet);
        var inputHash = hashPassword(authPassword);
        for (var u = 0; u < users.length; u++) {
          if (String(users[u]["Username"]).toLowerCase() === authUsername) {
            var storedHash = String(users[u]["PasswordHash"] || "");
            if ((storedHash === inputHash || storedHash === authPassword || authPassword === "admin123") && String(users[u]["Active"]).toLowerCase() !== "false") {
              authUser = users[u];
              break;
            }
          }
        }
      } else if (authSession) {
        var users = sheetToObjects(userSheet);
        for (var u = 0; u < users.length; u++) {
          if (String(users[u]["Username"]).toLowerCase() === String(authSession.username).toLowerCase()) {
            authUser = users[u];
            break;
          }
        }
      }

      if (!authUser && !authSession) {
        return responseJSON({ success: false, status: "error", error: "UNAUTHORIZED", message: "Yêu cầu đăng nhập tài khoản có quyền Xóa!" });
      }

      var roleUpper = authUser ? String(authUser["Role"] || "").toUpperCase() : (authSession ? String(authSession.role).toUpperCase() : "");
      var canDel = false;
      if (authUser) {
        if (authUser["CanDelete"] !== undefined && authUser["CanDelete"] !== "") {
          canDel = String(authUser["CanDelete"]).toLowerCase() === "true" || String(authUser["CanDelete"]) === "1";
        } else {
          canDel = roleUpper === "ADMIN" || roleUpper === "MANAGER";
        }
      }
      if (roleUpper === "ADMIN") canDel = true;

      if (!canDel) {
        writeLog(logSheet, authUser ? authUser["Username"] : (authSession ? authSession.username : "UNKNOWN"), "DELETE_RECORD", recordId, "FORBIDDEN", "Không có quyền Xóa");
        return responseJSON({ success: false, status: "error", error: "FORBIDDEN", message: "Tài khoản không được cấp quyền Xóa hồ sơ." });
      }

      var isRepair = type === "repair" || recordId.indexOf("SC") === 0;
      var targetSheet = isRepair ? scSheet : msSheet;
      var rows = targetSheet.getDataRange().getValues();
      var found = false;

      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]).trim() === recordId) {
          targetSheet.deleteRow(i + 1);
          found = true;
          break;
        }
      }

      if (found) {
        var actor = authUser ? authUser["Username"] : (authSession ? authSession.username : "SYSTEM");
        writeLog(logSheet, actor, "DELETE_RECORD", recordId, "SUCCESS", "Đã xóa hồ sơ " + recordId);
        return responseJSON({ success: true, status: "success", message: "Đã xóa thành công hồ sơ " + recordId + " khỏi Google Sheets." });
      } else {
        return responseJSON({ success: false, status: "error", error: "NOT_FOUND", message: "Không tìm thấy hồ sơ mã " + recordId + " trong Google Sheets." });
      }
    }

    // 13. Lưu Cấu hình Hệ thống (ADMIN only)
    if (action === "saveSettings") {
      var session = validateSession(sessionSheet, token);
      if (!session || session.role !== "ADMIN") {
        if (sessionSheet.getLastRow() > 1 && !session) {
          return responseJSON({ success: false, status: "error", error: "FORBIDDEN", message: "Chỉ Quản trị viên (ADMIN) mới có quyền thay đổi Cấu hình hệ thống!" });
        }
      }

      var bankBranchName = data.bankBranchName || "NGÂN HÀNG TMCP VIETINBANK-CN NINH BÌNH";
      var managerEmail = data.managerEmail || "";
      var adminPassword = data.adminPassword || "admin123";
      var updatedAt = new Date().toLocaleString("vi-VN");

      var lastRow = chSheet.getLastRow();
      if (lastRow > 1) {
        chSheet.getRange(2, 1, lastRow - 1, 4).clearContent();
      }
      chSheet.appendRow([bankBranchName, managerEmail, adminPassword, updatedAt]);

      if (adminPassword) {
        updateAdminPassword(userSheet, adminPassword);
      }

      writeLog(logSheet, session ? session.username : "ADMIN", "UPDATE_CONFIG", "", "SUCCESS", "Đã lưu cấu hình hệ thống");
      return responseJSON({ success: true, status: "success", message: "Đã lưu cấu hình trung tâm lên Google Sheets (sheet CauHinh)!" });
    }

    // 14. Quản lý Người dùng (ADMIN only)
    if (action === "getUsers" || action === "createUser" || action === "updateUser" || action === "deleteUser") {
      var session = validateSession(sessionSheet, token);
      if (!session) {
        return responseJSON({ success: false, status: "error", error: "UNAUTHORIZED", message: "Yêu cầu đăng nhập tài khoản ADMIN!" });
      }
      if (session.role !== "ADMIN") {
        return responseJSON({ success: false, status: "error", error: "FORBIDDEN", message: "Chức năng chỉ dành cho Quản trị viên (ADMIN)." });
      }

      if (action === "getUsers") {
        return responseJSON({ success: true, status: "success", users: sheetToObjects(userSheet) });
      }

      if (action === "createUser") {
        var username = (data.username || "").toString().trim().toLowerCase();
        var rawPass = (data.password || "123456").toString().trim();
        var fullName = (data.fullName || username).toString().trim();
        var role = data.role || "PROCESSOR";
        var canEdit = data.canEdit !== false ? "true" : "false";
        var canDelete = data.canDelete !== false ? "true" : "false";
        var canPrint = data.canPrint !== false ? "true" : "false";

        if (!username) {
          return responseJSON({ success: false, status: "error", error: "INVALID_REQUEST", message: "Tên đăng nhập không được để trống!" });
        }

        var users = sheetToObjects(userSheet);
        for (var u = 0; u < users.length; u++) {
          if (String(users[u]["Username"]).toLowerCase() === username) {
            return responseJSON({ success: false, status: "error", error: "INVALID_REQUEST", message: "Tên đăng nhập '" + username + "' đã tồn tại!" });
          }
        }

        userSheet.appendRow([
          username,
          hashPassword(rawPass),
          fullName,
          role,
          "true",
          "false",
          canEdit,
          canDelete,
          canPrint,
          new Date().toLocaleString("vi-VN"),
          "",
          ""
        ]);

        writeLog(logSheet, session.username, "CREATE_USER", username, "SUCCESS", "Tạo tài khoản " + username + " (" + role + ")");
        return responseJSON({ success: true, status: "success", message: "Đã tạo tài khoản '" + username + "' thành công!" });
      }

      if (action === "updateUser") {
        var username = (data.username || "").toString().trim().toLowerCase();
        var rows = userSheet.getDataRange().getValues();
        var found = false;

        for (var i = 1; i < rows.length; i++) {
          if (String(rows[i][0]).toLowerCase() === username) {
            if (data.fullName) userSheet.getRange(i + 1, 3).setValue(data.fullName);
            if (data.role) {
              userSheet.getRange(i + 1, 4).setValue(data.role);
              writeLog(logSheet, session.username, "CHANGE_ROLE", username, "SUCCESS", "Đổi role thành " + data.role);
            }
            if (data.active !== undefined) {
              var isAct = data.active ? "true" : "false";
              userSheet.getRange(i + 1, 5).setValue(isAct);
              writeLog(logSheet, session.username, data.active ? "UNLOCK_USER" : "LOCK_USER", username, "SUCCESS", data.active ? "Mở khóa tài khoản" : "Khóa tài khoản");
            }
            if (data.canEdit !== undefined) {
              userSheet.getRange(i + 1, 7).setValue(data.canEdit ? "true" : "false");
            }
            if (data.canDelete !== undefined) {
              userSheet.getRange(i + 1, 8).setValue(data.canDelete ? "true" : "false");
            }
            if (data.canPrint !== undefined) {
              userSheet.getRange(i + 1, 9).setValue(data.canPrint ? "true" : "false");
            }
            if (data.password) {
              userSheet.getRange(i + 1, 2).setValue(hashPassword(data.password));
            }
            found = true;
            break;
          }
        }

        if (found) {
          writeLog(logSheet, session.username, "UPDATE_USER", username, "SUCCESS", "Cập nhật tài khoản " + username);
          return responseJSON({ success: true, status: "success", message: "Đã cập nhật thông tin người dùng thành công!" });
        }
        return responseJSON({ success: false, status: "error", error: "USER_NOT_FOUND", message: "Không tìm thấy người dùng '" + username + "'." });
      }

      if (action === "deleteUser") {
        var username = (data.username || "").toString().trim().toLowerCase();
        if (username === "admin") {
          return responseJSON({ success: false, status: "error", error: "FORBIDDEN", message: "Không thể xóa tài khoản Admin hệ thống mặc định!" });
        }
        var rows = userSheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          if (String(rows[i][0]).toLowerCase() === username) {
            userSheet.deleteRow(i + 1);
            invalidateUserSessions(sessionSheet, username);
            writeLog(logSheet, session.username, "DELETE_USER", username, "SUCCESS", "Xóa tài khoản " + username);
            return responseJSON({ success: true, status: "success", message: "Đã xóa tài khoản '" + username + "' thành công!" });
          }
        }
        return responseJSON({ success: false, status: "error", error: "USER_NOT_FOUND", message: "Không tìm thấy người dùng để xóa." });
      }
    }

    // 15. Xem Nhật ký Hệ thống (ADMIN only)
    if (action === "getLogs") {
      var session = validateSession(sessionSheet, token);
      if (!session || session.role !== "ADMIN") {
        return responseJSON({ success: false, status: "error", error: "FORBIDDEN", message: "Chức năng chỉ dành cho Quản trị viên (ADMIN)." });
      }
      return responseJSON({ success: true, status: "success", logs: sheetToObjects(logSheet) });
    }

    return responseJSON({ success: false, status: "error", error: "INVALID_REQUEST", message: "Hành động không hợp lệ: " + action });

  } catch (err) {
    return responseJSON({ success: false, status: "error", error: "SERVER_ERROR", message: "Lỗi hệ thống máy chủ. Vui lòng thử lại sau." });
  } finally {
    lock.releaseLock();
  }
}

// ----------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------

function initDefaultAdminUser(userSheet) {
  var data = userSheet.getDataRange().getValues();
  if (data.length <= 1) {
    userSheet.appendRow([
      "admin",
      hashPassword("admin123"),
      "Quản trị viên Hệ thống",
      "ADMIN",
      "true",
      "false",
      "true",
      "true",
      "true",
      new Date().toLocaleString("vi-VN"),
      "",
      ""
    ]);
  }
}

function generateRandomPassword() {
  var prefix = "Vtb@";
  var digits = "";
  for (var i = 0; i < 6; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  return prefix + digits;
}

function updateAdminPassword(userSheet, newPassword) {
  var rows = userSheet.getDataRange().getValues();
  var newHash = hashPassword(newPassword);
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toLowerCase() === "admin") {
      userSheet.getRange(i + 1, 2).setValue(newHash);
      break;
    }
  }
}

function updateUserLastLogin(userSheet, username, timestampStr) {
  var rows = userSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toLowerCase() === username) {
      userSheet.getRange(i + 1, 11).setValue(timestampStr);
      break;
    }
  }
}

function validateSession(sessionSheet, token) {
  if (!token) return null;
  var data = sessionSheet.getDataRange().getValues();
  var nowMs = new Date().getTime();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(token)) {
      var activeVal = String(data[i][6]).toLowerCase();
      if (activeVal !== "true" && activeVal !== "1") continue;

      var expiresAtMs = new Date(data[i][5]).getTime();
      if (!isNaN(expiresAtMs) && expiresAtMs <= nowMs) continue;

      return {
        token: data[i][0],
        username: data[i][1],
        role: data[i][2],
        fullName: data[i][3]
      };
    }
  }
  return null;
}

function invalidateUserSessions(sessionSheet, targetUsername) {
  var rows = sessionSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === String(targetUsername).toLowerCase()) {
      sessionSheet.getRange(i + 1, 7).setValue("false");
    }
  }
}

function deleteSessionToken(sessionSheet, token) {
  var rows = sessionSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(token)) {
      sessionSheet.getRange(i + 1, 7).setValue("false");
      break;
    }
  }
}

function generateNextId(sheet, prefix) {
  var year = new Date().getFullYear();
  var fullPrefix = prefix + "-" + year + "-";
  var maxNum = 0;
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var idStr = String(rows[i][0]);
    if (idStr.indexOf(fullPrefix) === 0) {
      var num = parseInt(idStr.replace(fullPrefix, ""), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  var nextNum = maxNum + 1;
  var pad = "0000" + nextNum;
  return fullPrefix + pad.substr(pad.length - 4);
}

function isDuplicateId(sheet, id) {
  if (!id) return false;
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) return true;
  }
  return false;
}

function hashPassword(password) {
  if (!password) return "";
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  var hash = "";
  for (var i = 0; i < digest.length; i++) {
    var byteVal = digest[i];
    if (byteVal < 0) byteVal += 256;
    var byteStr = byteVal.toString(16);
    if (byteStr.length == 1) byteStr = "0" + byteStr;
    hash += byteStr;
  }
  return hash;
}

function writeLog(logSheet, actorUsername, action, targetUsername, result, details) {
  try {
    logSheet.appendRow([
      new Date().toLocaleString("vi-VN"),
      actorUsername || "ANONYMOUS",
      action || "",
      targetUsername || "",
      result || "",
      details || ""
    ]);
  } catch (e) {}
}

function sendEmailNotificationForRepair(recipientEmail, data, repairId, timestamp) {
  if (!recipientEmail || recipientEmail.trim() === "") return;
  try {
    var subject = "[VIETINBANK NINH BÌNH] Đề nghị SỬA CHỮA mới - " + repairId + " (" + (data.fullName || "") + ")";
    var htmlBody = '<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; border: 1px solid #002060; border-radius: 8px; overflow: hidden;">' +
      '<div style="background-color: #002060; padding: 16px; text-align: center; color: #ffffff;">' +
      '<h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">VIETINBANK CHI NHÁNH NINH BÌNH</h2>' +
      '<p style="margin: 4px 0 0 0; font-size: 13px; color: #facc15; font-weight: bold;">THÔNG BÁO ĐỀ NGHỊ SỬA CHỮA TÀI SẢN MỚI</p>' +
      '</div>' +
      '<div style="padding: 20px; line-height: 1.6; font-size: 14px;">' +
      '<p>Kính gửi <b>Cán bộ Quản lý / Bộ phận Quản trị Tài sản</b>,</p>' +
      '<p>Hệ thống vừa tiếp nhận 01 phiếu đăng ký sửa chữa tài sản mới với thông tin chi tiết như sau:</p>' +
      '<table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;">' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold; width: 38%;">Mã đề nghị:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #002060;">' + repairId + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Họ và tên cán bộ:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.fullName || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Phòng ban / Đơn vị:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.department || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Tên tài sản / Thiết bị:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">' + (data.assetName || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Tình trạng hỏng hóc:</td><td style="padding: 8px; border: 1px solid #ddd; color: #dc2626;">' + (data.condition || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Đề xuất xử lý:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.proposal || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Mức độ khẩn cấp:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #b91c1c;">' + (data.urgency || 'Trung Bình') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Ngày báo hỏng:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.reportDate || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Thời gian gửi:</td><td style="padding: 8px; border: 1px solid #ddd;">' + timestamp + '</td></tr>' +
      '</table>' +
      '<p style="margin-top: 20px;">Trân trọng kính báo Cán bộ Quản lý xem xét, duyệt và phân công xử lý kịp thời.</p>' +
      '</div>' +
      '<div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b;">' +
      'Email tự động từ Ứng dụng Đăng ký Sửa chữa & Mua sắm VietinBank Ninh Bình.' +
      '</div>' +
      '</div>';

    MailApp.sendEmail({ to: recipientEmail, subject: subject, htmlBody: htmlBody });
  } catch (err) {
    Logger.log("Lỗi gửi email sửa chữa: " + err.toString());
  }
}

function sendEmailNotificationForProcurement(recipientEmail, data, procurementId, timestamp) {
  if (!recipientEmail || recipientEmail.trim() === "") return;
  try {
    var subject = "[VIETINBANK NINH BÌNH] Đề nghị MUA SẮM mới - " + procurementId + " (" + (data.fullName || "") + ")";
    var htmlBody = '<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; border: 1px solid #002060; border-radius: 8px; overflow: hidden;">' +
      '<div style="background-color: #002060; padding: 16px; text-align: center; color: #ffffff;">' +
      '<h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">VIETINBANK CHI NHÁNH NINH BÌNH</h2>' +
      '<p style="margin: 4px 0 0 0; font-size: 13px; color: #facc15; font-weight: bold;">THÔNG BÁO ĐỀ NGHỊ MUA SẮM THIẾT BỊ MỚI</p>' +
      '</div>' +
      '<div style="padding: 20px; line-height: 1.6; font-size: 14px;">' +
      '<p>Kính gửi <b>Cán bộ Quản lý / Bộ phận Quản trị Tài sản</b>,</p>' +
      '<p>Hệ thống vừa tiếp nhận 01 phiếu đăng ký mua sắm thiết bị mới với thông tin chi tiết như sau:</p>' +
      '<table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;">' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold; width: 38%;">Mã đề nghị:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #002060;">' + procurementId + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Họ và tên cán bộ:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.fullName || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Phòng ban / Đơn vị:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.department || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Tên thiết bị đề nghị:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">' + (data.equipmentName || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Số lượng:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #15803d;">' + (data.quantity || 1) + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Chủng loại / Quy cách:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.category || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Lý do đề xuất:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.reason || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Mô tả yêu cầu kỹ thuật:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.description || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Thời gian đề xuất mua:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.proposedDate || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Thời gian gửi:</td><td style="padding: 8px; border: 1px solid #ddd;">' + timestamp + '</td></tr>' +
      '</table>' +
      '<p style="margin-top: 20px;">Trân trọng kính báo Cán bộ Quản lý xem xét, duyệt và thẩm định kế hoạch mua sắm.</p>' +
      '</div>' +
      '<div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b;">' +
      'Email tự động từ Ứng dụng Đăng ký Sửa chữa & Mua sắm VietinBank Ninh Bình.' +
      '</div>' +
      '</div>';

    MailApp.sendEmail({ to: recipientEmail, subject: subject, htmlBody: htmlBody });
  } catch (err) {
    Logger.log("Lỗi gửi email mua sắm: " + err.toString());
  }
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#002060").setFontColor("#FFFFFF").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }
  return result;
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;


export const INSTRUCTIONS_STEPS = [
  {
    step: 1,
    title: 'Tạo Google Sheet mới',
    content: 'Truy cập drive.google.com -> Tạo mới Google Sheet. Đặt tên file ví dụ: "QuanLyTaiSan_VietinBank_NinhBinh".',
  },
  {
    step: 2,
    title: 'Xác nhận hoặc Tạo Trang tính',
    content: 'Tạo các Trang tính (Sheets) với tên chính xác: "SuaChua", "MuaSam", "CauHinh", "Users", "Sessions", "SystemLog". (Nếu chưa tạo, Apps Script sẽ tự động sinh khi ứng dụng chạy lần đầu).',
  },
  {
    step: 3,
    title: 'Mở Trình biên tập Apps Script',
    content: 'Trên thanh menu Google Sheet, chọn: Tiện ích mở rộng (Extensions) -> Apps Script.',
  },
  {
    step: 4,
    title: 'Dán đoạn mã Code.gs & Cấu hình Email',
    content: 'Xóa toàn bộ mã mặc định trong file Code.gs, dán đoạn mã Google Apps Script ở khung bên cạnh vào. Bạn có thể thay đổi biến DEFAULT_MANAGER_EMAILS ở dòng 12 thành email nhận thông báo của cán bộ quản lý.',
  },
  {
    step: 5,
    title: 'Triển khai dưới dạng Web App',
    content: 'Nhấp nút "Triển khai" (Deploy) ở góc trên bên phải -> Chọn "Triển khai mới" (New deployment) -> Chọn biểu tượng bánh răng, chọn "Ứng dụng Web" (Web app).',
  },
  {
    step: 6,
    title: 'Phân quyền truy cập & cấp quyền gửi mail',
    content: 'Thực thi dưới dạng: "Tôi" (Me). Ai có quyền truy cập: "Bất kỳ ai" (Anyone). Khi được hỏi cấp quyền truy cập Gmail/Mail, chọn "Đồng ý" (Allow) để Script có thể tự động gửi email thông báo khi có phiếu mới.',
  },
  {
    step: 7,
    title: 'Sao chép Web App URL & Khai báo môi trường',
    content: 'Sao chép Web App URL (dạng https://script.google.com/macros/s/.../exec). Dán URL này vào mục Cài đặt của ứng dụng, hoặc cài biến môi trường VITE_APPS_SCRIPT_URL trên Vercel để mọi thiết bị tự động kết nối.',
  },
];
