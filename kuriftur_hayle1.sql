/*
 Navicat Premium Data Transfer

 Source Server         : localhost
 Source Server Type    : MySQL
 Source Server Version : 100432 (10.4.32-MariaDB)
 Source Host           : localhost:3306
 Source Schema         : kuriftur_hayle

 Target Server Type    : MySQL
 Target Server Version : 100432 (10.4.32-MariaDB)
 File Encoding         : 65001

 Date: 28/08/2025 19:56:56
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for email_verification_tokens
-- ----------------------------
DROP TABLE IF EXISTS `email_verification_tokens`;
CREATE TABLE `email_verification_tokens`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp ON UPDATE CURRENT_TIMESTAMP,
  `used` tinyint(1) NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `token`(`token` ASC) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE,
  INDEX `idx_expires_at`(`expires_at` ASC) USING BTREE,
  CONSTRAINT `email_verification_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of email_verification_tokens
-- ----------------------------

-- ----------------------------
-- Table structure for giftcards
-- ----------------------------
DROP TABLE IF EXISTS `giftcards`;
CREATE TABLE `giftcards`  (
  `gift_card_id` int NOT NULL AUTO_INCREMENT,
  `card_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `card_type` enum('eCard','physical') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `initial_amount` decimal(10, 2) NOT NULL,
  `current_balance` decimal(10, 2) NOT NULL,
  `issued_to_guest_id` int NULL DEFAULT NULL,
  `issued_at` datetime NULL DEFAULT current_timestamp,
  `expiry_date` date NULL DEFAULT NULL,
  `status` enum('active','redeemed','expired','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'active',
  `payment_status` enum('pending','completed','failed','refunded','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'pending',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `created_at` datetime NULL DEFAULT current_timestamp,
  `updated_at` datetime NULL DEFAULT current_timestamp ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`gift_card_id`) USING BTREE,
  UNIQUE INDEX `card_code`(`card_code` ASC) USING BTREE,
  INDEX `idx_card_code`(`card_code` ASC) USING BTREE,
  INDEX `idx_issued_to_guest_id`(`issued_to_guest_id` ASC) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE,
  INDEX `idx_expiry_date`(`expiry_date` ASC) USING BTREE,
  CONSTRAINT `giftcards_ibfk_1` FOREIGN KEY (`issued_to_guest_id`) REFERENCES `guests` (`guest_id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `chk_balance_not_exceed_initial` CHECK (`current_balance` <= `initial_amount`),
  CONSTRAINT `giftcards_chk_1` CHECK (`initial_amount` >= 0),
  CONSTRAINT `giftcards_chk_2` CHECK (`current_balance` >= 0)
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of giftcards
-- ----------------------------
INSERT INTO `giftcards` VALUES (1, 'GC-AB4CEB035041B015', 'eCard', 100.00, 100.00, 5, '2025-08-26 04:23:32', '2025-08-30', 'active', 'pending', '123', '2025-08-26 04:23:32', '2025-08-26 04:23:32', NULL);
INSERT INTO `giftcards` VALUES (2, 'GC-70526FA545784CD4', 'eCard', 100.00, 100.00, 5, '2025-08-26 04:23:43', '2025-08-30', 'active', 'pending', '123', '2025-08-26 04:23:43', '2025-08-26 04:23:43', NULL);

-- ----------------------------
-- Table structure for guests
-- ----------------------------
DROP TABLE IF EXISTS `guests`;
CREATE TABLE `guests`  (
  `guest_id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `last_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `gender` enum('male','female','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `zip_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `date_of_birth` date NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp,
  `updated_at` timestamp NULL DEFAULT current_timestamp ON UPDATE CURRENT_TIMESTAMP,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  PRIMARY KEY (`guest_id`) USING BTREE,
  UNIQUE INDEX `email`(`email` ASC) USING BTREE,
  INDEX `idx_email`(`email` ASC) USING BTREE,
  INDEX `idx_phone`(`phone` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of guests
-- ----------------------------
INSERT INTO `guests` VALUES (5, 'guest', 'guest', 'guest@gmail.com', 'male', '', '', '', '', '', '2025-08-13', '2025-08-25 04:43:22', '2025-08-27 03:16:13', '123asdf');
INSERT INTO `guests` VALUES (6, 'user', 'user', 'user@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-08-27 03:21:04', '2025-08-27 03:21:04', NULL);
INSERT INTO `guests` VALUES (7, 'Amanueal', 'Daba', 'aman@pier5studios.com', 'male', '2406409315', 'United States', 'Silver Spring', '20902', '2101 Belvedere Blvd\napt 2', '1998-08-02', '2025-08-27 17:39:07', '2025-08-27 17:39:07', 'he\'s American ');

-- ----------------------------
-- Table structure for menu_items
-- ----------------------------
DROP TABLE IF EXISTS `menu_items`;
CREATE TABLE `menu_items`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `menu_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `label` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `icon` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `href` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `parent_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `sort_order` int NULL DEFAULT 0,
  `is_active` tinyint(1) NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp,
  `updated_at` timestamp NULL DEFAULT current_timestamp ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `menu_id`(`menu_id` ASC) USING BTREE,
  INDEX `idx_parent_id`(`parent_id` ASC) USING BTREE,
  INDEX `idx_sort_order`(`sort_order` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 20 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of menu_items
-- ----------------------------
INSERT INTO `menu_items` VALUES (1, 'dashboard', 'Dashboard', 'LayoutDashboard', '/dashboard', NULL, 1, 1, '2025-08-22 02:08:21', '2025-08-22 12:04:34');
INSERT INTO `menu_items` VALUES (2, 'reservation', 'Reservation', 'Calendar', '/reservations', NULL, 2, 1, '2025-08-22 02:08:21', '2025-08-22 12:04:34');
INSERT INTO `menu_items` VALUES (3, 'room-operation', 'Room Operation', 'Building2', NULL, NULL, 3, 1, '2025-08-22 02:08:21', '2025-08-22 12:04:34');
INSERT INTO `menu_items` VALUES (4, 'manage-guests', 'Manage Guests', 'User', '/guests', NULL, 4, 1, '2025-08-22 02:08:21', '2025-08-22 12:04:34');
INSERT INTO `menu_items` VALUES (5, 'promo-code', 'Promo Code Management', 'CreditCard', '/promo-code', NULL, 5, 1, '2025-08-22 02:08:21', '2025-08-22 12:04:34');
INSERT INTO `menu_items` VALUES (6, 'gift-card', 'Gift Card Management', 'Gift', '/gift-card-management', NULL, 6, 1, '2025-08-22 02:08:21', '2025-08-25 02:29:47');
INSERT INTO `menu_items` VALUES (7, 'employee-management', 'Employee Management', 'Users', '/employee-management', NULL, 7, 1, '2025-08-22 02:08:21', '2025-08-22 12:04:34');
INSERT INTO `menu_items` VALUES (8, 'permission-management', 'Permission Management', 'Shield', '/permission-management', NULL, 8, 1, '2025-08-22 02:08:21', '2025-08-22 12:04:34');
INSERT INTO `menu_items` VALUES (9, 'room-group', 'Room Group', 'Building2', '/room-group', 'room-operation', 1, 1, '2025-08-22 02:08:21', '2025-08-22 12:04:34');
INSERT INTO `menu_items` VALUES (10, 'room-type', 'Room Type', 'Building2', '/room-type', 'room-operation', 2, 1, '2025-08-22 02:08:21', '2025-08-22 12:04:34');
INSERT INTO `menu_items` VALUES (11, 'room-management', 'Room Group Room Types', 'Settings', '/room-management', 'room-operation', 3, 1, '2025-08-22 02:08:21', '2025-08-22 12:04:34');
INSERT INTO `menu_items` VALUES (12, 'room-images', 'Room Image', 'Image', '/room-images', 'room-operation', 4, 1, '2025-08-22 02:08:21', '2025-08-27 02:50:16');
INSERT INTO `menu_items` VALUES (13, 'room-pricing', 'Room Pricing', 'DollarSign', '/room-pricing', 'room-operation', 5, 1, '2025-08-22 02:08:21', '2025-08-22 12:04:34');
INSERT INTO `menu_items` VALUES (14, 'rooms', 'Rooms', 'Bed', '/rooms', 'room-operation', 6, 1, '2025-08-22 02:08:21', '2025-08-22 12:04:34');
INSERT INTO `menu_items` VALUES (15, 'reports-logs', 'Reports & Logs', 'BarChart3', NULL, NULL, 9, 1, '2025-08-22 12:04:34', '2025-08-22 12:04:34');
INSERT INTO `menu_items` VALUES (16, 'daily-arrivals-departures', 'Daily Arrivals/Departures', 'Calendar', '/reports/daily-arrivals-departures', 'reports-logs', 1, 1, '2025-08-22 12:04:34', '2025-08-22 12:04:34');
INSERT INTO `menu_items` VALUES (17, 'occupancy-revenue', 'Occupancy & Revenue Report', 'TrendingUp', '/reports/occupancy-revenue', 'reports-logs', 2, 1, '2025-08-22 12:04:34', '2025-08-22 12:04:34');
INSERT INTO `menu_items` VALUES (18, 'staff-activity-log', 'Staff Activity Log', 'Activity', '/reports/staff-activity-log', 'reports-logs', 3, 1, '2025-08-22 12:04:34', '2025-08-22 12:04:34');
INSERT INTO `menu_items` VALUES (19, 'no-show-cancellation', 'No-Show & Cancellation Tracking', 'XCircle', '/reports/no-show-cancellation', 'reports-logs', 4, 1, '2025-08-22 12:04:34', '2025-08-22 12:04:34');

-- ----------------------------
-- Table structure for menu_permissions
-- ----------------------------
DROP TABLE IF EXISTS `menu_permissions`;
CREATE TABLE `menu_permissions`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `menu_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `can_view` tinyint(1) NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp,
  `updated_at` timestamp NULL DEFAULT current_timestamp ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `unique_role_menu`(`role_id` ASC, `menu_id` ASC) USING BTREE,
  INDEX `idx_role_id`(`role_id` ASC) USING BTREE,
  INDEX `idx_menu_id`(`menu_id` ASC) USING BTREE,
  CONSTRAINT `menu_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `user_roles` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 137 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of menu_permissions
-- ----------------------------
INSERT INTO `menu_permissions` VALUES (1, 1, 'dashboard', 1, '2025-08-22 02:08:21', '2025-08-22 02:08:21');
INSERT INTO `menu_permissions` VALUES (2, 1, 'employee-management', 1, '2025-08-22 02:08:21', '2025-08-22 02:08:21');
INSERT INTO `menu_permissions` VALUES (3, 1, 'gift-card', 1, '2025-08-22 02:08:21', '2025-08-22 02:08:21');
INSERT INTO `menu_permissions` VALUES (4, 1, 'manage-guests', 1, '2025-08-22 02:08:21', '2025-08-22 02:08:21');
INSERT INTO `menu_permissions` VALUES (5, 1, 'permission-management', 1, '2025-08-22 02:08:21', '2025-08-22 02:08:21');
INSERT INTO `menu_permissions` VALUES (6, 1, 'promo-code', 1, '2025-08-22 02:08:21', '2025-08-22 02:08:21');
INSERT INTO `menu_permissions` VALUES (7, 1, 'reservation', 1, '2025-08-22 02:08:21', '2025-08-22 02:08:21');
INSERT INTO `menu_permissions` VALUES (8, 1, 'room-group', 1, '2025-08-22 02:08:21', '2025-08-22 02:08:21');
INSERT INTO `menu_permissions` VALUES (9, 1, 'room-management', 1, '2025-08-22 02:08:21', '2025-08-22 02:08:21');
INSERT INTO `menu_permissions` VALUES (10, 1, 'room-operation', 1, '2025-08-22 02:08:21', '2025-08-22 02:08:21');
INSERT INTO `menu_permissions` VALUES (11, 1, 'room-pricing', 1, '2025-08-22 02:08:21', '2025-08-22 02:08:21');
INSERT INTO `menu_permissions` VALUES (12, 1, 'room-type', 1, '2025-08-22 02:08:21', '2025-08-22 02:08:21');
INSERT INTO `menu_permissions` VALUES (13, 1, 'room-images', 1, '2025-08-22 02:08:21', '2025-08-27 02:52:03');
INSERT INTO `menu_permissions` VALUES (14, 1, 'rooms', 1, '2025-08-22 02:08:21', '2025-08-22 02:08:21');
INSERT INTO `menu_permissions` VALUES (16, 2, 'dashboard', 1, '2025-08-22 02:08:21', '2025-08-22 02:24:08');
INSERT INTO `menu_permissions` VALUES (17, 2, 'gift-card', 1, '2025-08-22 02:08:21', '2025-08-22 02:24:08');
INSERT INTO `menu_permissions` VALUES (18, 2, 'manage-guests', 1, '2025-08-22 02:08:21', '2025-08-22 02:24:08');
INSERT INTO `menu_permissions` VALUES (19, 2, 'promo-code', 1, '2025-08-22 02:08:21', '2025-08-22 02:24:08');
INSERT INTO `menu_permissions` VALUES (20, 2, 'reservation', 1, '2025-08-22 02:08:21', '2025-08-22 02:24:08');
INSERT INTO `menu_permissions` VALUES (21, 2, 'room-group', 0, '2025-08-22 02:08:21', '2025-08-22 03:13:45');
INSERT INTO `menu_permissions` VALUES (22, 2, 'room-management', 0, '2025-08-22 02:08:21', '2025-08-22 03:13:45');
INSERT INTO `menu_permissions` VALUES (23, 2, 'room-operation', 1, '2025-08-22 02:08:21', '2025-08-22 11:39:31');
INSERT INTO `menu_permissions` VALUES (24, 2, 'room-pricing', 0, '2025-08-22 02:08:21', '2025-08-22 03:13:46');
INSERT INTO `menu_permissions` VALUES (25, 2, 'room-type', 1, '2025-08-22 02:08:21', '2025-08-22 11:39:31');
INSERT INTO `menu_permissions` VALUES (26, 2, 'room-type-images', 0, '2025-08-22 02:08:21', '2025-08-22 03:13:46');
INSERT INTO `menu_permissions` VALUES (27, 2, 'rooms', 0, '2025-08-22 02:08:21', '2025-08-22 03:13:46');
INSERT INTO `menu_permissions` VALUES (31, 3, 'dashboard', 1, '2025-08-22 02:08:21', '2025-08-22 02:21:19');
INSERT INTO `menu_permissions` VALUES (32, 3, 'manage-guests', 1, '2025-08-22 02:08:21', '2025-08-22 02:21:19');
INSERT INTO `menu_permissions` VALUES (33, 3, 'reservation', 1, '2025-08-22 02:08:21', '2025-08-22 02:21:19');
INSERT INTO `menu_permissions` VALUES (34, 3, 'room-group', 1, '2025-08-22 02:08:21', '2025-08-22 02:21:19');
INSERT INTO `menu_permissions` VALUES (35, 3, 'room-management', 1, '2025-08-22 02:08:21', '2025-08-22 02:21:19');
INSERT INTO `menu_permissions` VALUES (36, 3, 'room-operation', 1, '2025-08-22 02:08:21', '2025-08-22 02:21:19');
INSERT INTO `menu_permissions` VALUES (37, 3, 'room-pricing', 1, '2025-08-22 02:08:21', '2025-08-22 02:21:19');
INSERT INTO `menu_permissions` VALUES (38, 3, 'room-type', 1, '2025-08-22 02:08:21', '2025-08-22 02:21:19');
INSERT INTO `menu_permissions` VALUES (39, 3, 'room-images', 1, '2025-08-22 02:08:21', '2025-08-27 02:52:13');
INSERT INTO `menu_permissions` VALUES (40, 3, 'rooms', 1, '2025-08-22 02:08:21', '2025-08-22 02:21:19');
INSERT INTO `menu_permissions` VALUES (46, 4, 'dashboard', 1, '2025-08-22 02:08:21', '2025-08-22 03:08:52');
INSERT INTO `menu_permissions` VALUES (47, 4, 'manage-guests', 0, '2025-08-22 02:08:21', '2025-08-22 02:24:28');
INSERT INTO `menu_permissions` VALUES (48, 4, 'reservation', 1, '2025-08-22 02:08:21', '2025-08-22 02:24:28');
INSERT INTO `menu_permissions` VALUES (57, 3, 'promo-code', 0, '2025-08-22 02:18:36', '2025-08-22 02:21:19');
INSERT INTO `menu_permissions` VALUES (59, 3, 'gift-card', 0, '2025-08-22 02:18:36', '2025-08-22 02:21:19');
INSERT INTO `menu_permissions` VALUES (61, 3, 'employee-management', 0, '2025-08-22 02:18:36', '2025-08-22 02:21:19');
INSERT INTO `menu_permissions` VALUES (62, 3, 'permission-management', 0, '2025-08-22 02:18:36', '2025-08-22 02:21:19');
INSERT INTO `menu_permissions` VALUES (107, 2, 'employee-management', 0, '2025-08-22 02:24:08', '2025-08-22 02:24:08');
INSERT INTO `menu_permissions` VALUES (108, 2, 'permission-management', 0, '2025-08-22 02:24:08', '2025-08-22 02:24:08');
INSERT INTO `menu_permissions` VALUES (112, 4, 'room-group', 1, '2025-08-22 02:24:28', '2025-08-26 03:19:58');
INSERT INTO `menu_permissions` VALUES (116, 4, 'room-type', 1, '2025-08-22 02:24:28', '2025-08-26 03:19:58');
INSERT INTO `menu_permissions` VALUES (117, 4, 'room-management', 1, '2025-08-22 02:24:28', '2025-08-26 03:19:58');
INSERT INTO `menu_permissions` VALUES (118, 4, 'room-operation', 1, '2025-08-22 02:24:28', '2025-08-26 03:19:58');
INSERT INTO `menu_permissions` VALUES (120, 4, 'room-images', 1, '2025-08-22 02:24:28', '2025-08-27 02:52:18');
INSERT INTO `menu_permissions` VALUES (121, 4, 'promo-code', 1, '2025-08-22 02:24:28', '2025-08-22 02:43:06');
INSERT INTO `menu_permissions` VALUES (122, 4, 'room-pricing', 1, '2025-08-22 02:24:28', '2025-08-26 03:19:58');
INSERT INTO `menu_permissions` VALUES (123, 4, 'gift-card', 1, '2025-08-22 02:24:28', '2025-08-22 02:43:05');
INSERT INTO `menu_permissions` VALUES (124, 4, 'rooms', 1, '2025-08-22 02:24:28', '2025-08-26 03:19:58');
INSERT INTO `menu_permissions` VALUES (125, 4, 'employee-management', 0, '2025-08-22 02:24:28', '2025-08-22 02:24:28');
INSERT INTO `menu_permissions` VALUES (126, 4, 'permission-management', 0, '2025-08-22 02:24:28', '2025-08-22 02:24:28');
INSERT INTO `menu_permissions` VALUES (127, 2, 'reports-logs', 0, '2025-08-22 12:05:43', '2025-08-22 12:30:42');
INSERT INTO `menu_permissions` VALUES (128, 2, 'staff-activity-log', 0, '2025-08-22 12:05:43', '2025-08-22 12:30:42');
INSERT INTO `menu_permissions` VALUES (129, 2, 'no-show-cancellation', 0, '2025-08-22 12:05:43', '2025-08-22 12:30:42');
INSERT INTO `menu_permissions` VALUES (130, 2, 'occupancy-revenue', 0, '2025-08-22 12:05:43', '2025-08-22 12:30:42');
INSERT INTO `menu_permissions` VALUES (131, 2, 'daily-arrivals-departures', 0, '2025-08-22 12:05:43', '2025-08-22 12:30:42');
INSERT INTO `menu_permissions` VALUES (132, 1, 'reports-logs', 1, '2025-08-22 12:05:43', '2025-08-22 12:05:43');
INSERT INTO `menu_permissions` VALUES (133, 1, 'staff-activity-log', 1, '2025-08-22 12:05:43', '2025-08-22 12:05:43');
INSERT INTO `menu_permissions` VALUES (134, 1, 'no-show-cancellation', 1, '2025-08-22 12:05:43', '2025-08-22 12:05:43');
INSERT INTO `menu_permissions` VALUES (135, 1, 'occupancy-revenue', 1, '2025-08-22 12:05:43', '2025-08-22 12:05:43');
INSERT INTO `menu_permissions` VALUES (136, 1, 'daily-arrivals-departures', 1, '2025-08-22 12:05:43', '2025-08-22 12:06:07');

-- ----------------------------
-- Table structure for promo_codes
-- ----------------------------
DROP TABLE IF EXISTS `promo_codes`;
CREATE TABLE `promo_codes`  (
  `promo_code_id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `discount_type` enum('percentage','fixed_amount') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'percentage',
  `discount_value` decimal(10, 2) NOT NULL,
  `min_amount` decimal(10, 2) NULL DEFAULT 0.00,
  `max_discount` decimal(10, 2) NULL DEFAULT NULL,
  `valid_from` datetime NOT NULL,
  `valid_until` datetime NOT NULL,
  `max_usage` int NULL DEFAULT NULL,
  `current_usage` int NULL DEFAULT 0,
  `status` enum('active','inactive','expired') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'active',
  `created_by` int NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp,
  `updated_at` timestamp NULL DEFAULT current_timestamp ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`promo_code_id`) USING BTREE,
  UNIQUE INDEX `code`(`code` ASC) USING BTREE,
  INDEX `idx_code`(`code` ASC) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE,
  INDEX `idx_valid_from`(`valid_from` ASC) USING BTREE,
  INDEX `idx_valid_until`(`valid_until` ASC) USING BTREE,
  INDEX `idx_created_by`(`created_by` ASC) USING BTREE,
  CONSTRAINT `promo_codes_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `chk_current_usage_non_negative` CHECK (`current_usage` >= 0),
  CONSTRAINT `chk_discount_value_positive` CHECK (`discount_value` > 0),
  CONSTRAINT `chk_max_usage_positive` CHECK (`max_usage` is null or `max_usage` > 0),
  CONSTRAINT `chk_min_amount_non_negative` CHECK (`min_amount` >= 0),
  CONSTRAINT `chk_valid_dates` CHECK (`valid_until` > `valid_from`)
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of promo_codes
-- ----------------------------
INSERT INTO `promo_codes` VALUES (1, '569HCN', '123', 'percentage', 10.00, 1.00, 2.00, '2025-08-27 00:00:00', '2025-08-30 00:00:00', NULL, 0, 'active', 2, '2025-08-26 10:36:04', '2025-08-26 10:40:06', NULL);

-- ----------------------------
-- Table structure for reservations
-- ----------------------------
DROP TABLE IF EXISTS `reservations`;
CREATE TABLE `reservations`  (
  `reservation_id` int NOT NULL AUTO_INCREMENT,
  `reservation_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `guest_id` int NOT NULL,
  `room_id` int NOT NULL,
  `check_in_date` date NOT NULL,
  `check_out_date` date NOT NULL,
  `check_in_time` time NULL DEFAULT '14:00:00',
  `check_out_time` time NULL DEFAULT '11:00:00',
  `num_adults` int NOT NULL DEFAULT 1,
  `num_children` int NULL DEFAULT 0,
  `children_ages` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `special_requests` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `total_price` decimal(10, 2) NULL DEFAULT 0.00,
  `status` enum('confirmed','cancelled','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'confirmed',
  `cancelled_at` datetime NULL DEFAULT NULL,
  `completed_at` datetime NULL DEFAULT NULL,
  `payment_status` enum('pending','paid','failed','refunded') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'pending',
  `source` enum('website','mobile_app','walk_in','agent','call_center') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'website',
  `created_at` timestamp NULL DEFAULT current_timestamp,
  `updated_at` timestamp NULL DEFAULT current_timestamp ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`reservation_id`) USING BTREE,
  UNIQUE INDEX `reservation_code`(`reservation_code` ASC) USING BTREE,
  INDEX `idx_guest`(`guest_id` ASC) USING BTREE,
  INDEX `idx_room`(`room_id` ASC) USING BTREE,
  CONSTRAINT `reservations_ibfk_1` FOREIGN KEY (`guest_id`) REFERENCES `guests` (`guest_id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `reservations_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of reservations
-- ----------------------------
INSERT INTO `reservations` VALUES (3, 'RES-MEU73U5N-NFS7X', 5, 15, '2025-08-28', '2025-08-30', '14:00:00', '11:00:00', 2, 2, '1,2', '', 440.00, 'confirmed', NULL, NULL, 'pending', 'website', '2025-08-27 12:34:44', '2025-08-27 15:27:16');
INSERT INTO `reservations` VALUES (4, 'RES-MEUK9R2W-3NDL3', 7, 22, '2025-08-28', '2025-08-31', '14:00:00', '11:00:00', 4, 0, '6', '', 1067.50, 'confirmed', NULL, NULL, 'paid', 'walk_in', '2025-08-27 17:43:15', '2025-08-27 17:43:15');
INSERT INTO `reservations` VALUES (5, 'RES-MEVIZZT1-XPVUB', 7, 19, '2025-08-28', '2025-08-30', '14:00:00', '11:00:00', 4, 0, '', '', 927.78, 'confirmed', NULL, NULL, 'pending', 'mobile_app', '2025-08-28 09:55:26', '2025-08-28 09:55:26');

-- ----------------------------
-- Table structure for roomgrouproomtype
-- ----------------------------
DROP TABLE IF EXISTS `roomgrouproomtype`;
CREATE TABLE `roomgrouproomtype`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_group_id` int NOT NULL,
  `room_type_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp,
  `updated_at` timestamp NULL DEFAULT current_timestamp ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_room_group_type`(`room_group_id` ASC, `room_type_id` ASC) USING BTREE,
  INDEX `fk_room_type`(`room_type_id` ASC) USING BTREE,
  CONSTRAINT `fk_room_group` FOREIGN KEY (`room_group_id`) REFERENCES `roomgroups` (`room_group_id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_room_type` FOREIGN KEY (`room_type_id`) REFERENCES `roomtypes` (`room_type_id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 47 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of roomgrouproomtype
-- ----------------------------
INSERT INTO `roomgrouproomtype` VALUES (29, 29, 14, '2025-08-27 12:16:13', '2025-08-27 12:16:13');
INSERT INTO `roomgrouproomtype` VALUES (30, 30, 15, '2025-08-27 15:22:59', '2025-08-27 15:22:59');
INSERT INTO `roomgrouproomtype` VALUES (31, 31, 15, '2025-08-27 15:43:06', '2025-08-27 15:43:06');
INSERT INTO `roomgrouproomtype` VALUES (32, 32, 17, '2025-08-27 15:43:25', '2025-08-27 15:43:25');
INSERT INTO `roomgrouproomtype` VALUES (33, 32, 18, '2025-08-27 15:43:25', '2025-08-27 15:43:25');
INSERT INTO `roomgrouproomtype` VALUES (34, 33, 17, '2025-08-27 15:44:07', '2025-08-27 15:44:07');
INSERT INTO `roomgrouproomtype` VALUES (35, 34, 17, '2025-08-27 15:44:27', '2025-08-27 15:44:27');
INSERT INTO `roomgrouproomtype` VALUES (36, 34, 18, '2025-08-27 15:44:27', '2025-08-27 15:44:27');
INSERT INTO `roomgrouproomtype` VALUES (37, 35, 17, '2025-08-27 15:44:47', '2025-08-27 15:44:47');
INSERT INTO `roomgrouproomtype` VALUES (38, 35, 18, '2025-08-27 15:44:47', '2025-08-27 15:44:47');
INSERT INTO `roomgrouproomtype` VALUES (39, 36, 17, '2025-08-27 15:45:44', '2025-08-27 15:45:44');
INSERT INTO `roomgrouproomtype` VALUES (40, 36, 18, '2025-08-27 15:45:44', '2025-08-27 15:45:44');
INSERT INTO `roomgrouproomtype` VALUES (41, 37, 18, '2025-08-27 15:46:08', '2025-08-27 15:46:08');
INSERT INTO `roomgrouproomtype` VALUES (42, 37, 17, '2025-08-27 15:46:08', '2025-08-27 15:46:08');
INSERT INTO `roomgrouproomtype` VALUES (43, 37, 15, '2025-08-27 15:46:08', '2025-08-27 15:46:08');
INSERT INTO `roomgrouproomtype` VALUES (44, 38, 19, '2025-08-27 16:52:26', '2025-08-27 16:52:26');
INSERT INTO `roomgrouproomtype` VALUES (45, 39, 20, '2025-08-27 16:56:50', '2025-08-27 16:56:50');
INSERT INTO `roomgrouproomtype` VALUES (46, 39, 21, '2025-08-27 16:56:50', '2025-08-27 16:56:50');

-- ----------------------------
-- Table structure for roomgroups
-- ----------------------------
DROP TABLE IF EXISTS `roomgroups`;
CREATE TABLE `roomgroups`  (
  `room_group_id` int NOT NULL AUTO_INCREMENT,
  `group_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp,
  `hotel` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`room_group_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 40 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of roomgroups
-- ----------------------------
INSERT INTO `roomgroups` VALUES (29, 'Ethiopia', '', '2025-08-27 12:16:03', 'africanVillage');
INSERT INTO `roomgroups` VALUES (30, 'Equatorial Guinea', '', '2025-08-27 15:22:50', 'africanVillage');
INSERT INTO `roomgroups` VALUES (31, 'The Royal Presidential suite', 'Poised in stillness and light, the Royal Presidential Suite invites harmony. A private retreat where warmth, breath, and beauty meet for rest, reflection, and renewal.', '2025-08-27 15:29:03', 'bishoftu');
INSERT INTO `roomgroups` VALUES (32, 'Lake Side', 'Framed by still water, the Lake Side Room opens to reflections of sky and silence where dawn arrives unhurried, and nature rests just beyond the threshold.', '2025-08-27 15:30:16', 'bishoftu');
INSERT INTO `roomgroups` VALUES (33, 'Morning Breeze Suite', 'Morning birdsong and lake air drift through sunlit stillness. The Morning Breeze Suite is a secluded threshold where day begins in clarity, warmth, and effortless grace.', '2025-08-27 15:32:45', 'bishoftu');
INSERT INTO `roomgroups` VALUES (34, 'Veranda suite', 'A quiet refuge embraced by garden whispers, the Veranda Suite invites gentle moments of pause where soft light and calm pathways frame your day’s unfolding.', '2025-08-27 15:34:52', 'bishoftu');
INSERT INTO `roomgroups` VALUES (35, 'Tranquil Cabana', 'Nestled near shaded cabanas, the room welcomes gentle whispers and quiet moments, a serene outlook where nature’s rhythm softens and time expands in hushed reverence.', '2025-08-27 15:35:18', 'bishoftu');
INSERT INTO `roomgroups` VALUES (36, 'Gateway Retreat', 'Set at the resort’s edge, the Gateway Retreat welcomes with quiet ease where morning light meets movement, and restful moments unfold close to paths of gathering.', '2025-08-27 15:35:47', 'bishoftu');
INSERT INTO `roomgroups` VALUES (37, 'Splash view suite', 'Set beside shimmering pools and lively waters, the suite offers a gentle refuge where stillness meets the soft cadence of shared delight.', '2025-08-27 15:40:19', 'bishoftu');
INSERT INTO `roomgroups` VALUES (38, 'Presidential', 'Embraced by towering trees, the glass-clad Oasis cabin floats in silence where fire-grilled meals and starlit skies unfold across a terrace suspended in stillness.', '2025-08-27 16:50:04', 'entoto');
INSERT INTO `roomgroups` VALUES (39, 'Glamping Tents', 'Among Entoto’s quiet ridges, glamping invites stillness with the lightest touch, an intimate, low-impact retreat where nature is not escaped but respectfully embraced.', '2025-08-27 16:50:38', 'entoto');

-- ----------------------------
-- Table structure for roompricing
-- ----------------------------
DROP TABLE IF EXISTS `roompricing`;
CREATE TABLE `roompricing`  (
  `pricing_id` int NOT NULL AUTO_INCREMENT,
  `room_group_room_type_id` int NOT NULL,
  `hotel` enum('africanVillage','bishoftu','entoto','laketana','awashfall') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `occupancy` int NOT NULL,
  `price` decimal(10, 2) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp,
  `day_of_week` enum('weekdays','weekends') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`pricing_id`) USING BTREE,
  INDEX `room_group_room_type_id`(`room_group_room_type_id` ASC) USING BTREE,
  CONSTRAINT `roompricing_ibfk_1` FOREIGN KEY (`room_group_room_type_id`) REFERENCES `roomgrouproomtype` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 17 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of roompricing
-- ----------------------------
INSERT INTO `roompricing` VALUES (9, 29, 'africanVillage', 2, 176.00, '2025-08-27 12:16:47', 'weekdays');
INSERT INTO `roompricing` VALUES (10, 30, 'africanVillage', 4, 278.00, '2025-08-27 15:25:30', 'weekends');
INSERT INTO `roompricing` VALUES (11, 42, 'bishoftu', 2, 149.00, '2025-08-27 15:49:10', 'weekdays');
INSERT INTO `roompricing` VALUES (12, 41, 'bishoftu', 2, 153.40, '2025-08-27 15:49:30', 'weekdays');
INSERT INTO `roompricing` VALUES (13, 43, 'bishoftu', 4, 265.70, '2025-08-27 15:49:57', 'weekdays');
INSERT INTO `roompricing` VALUES (14, 31, 'bishoftu', 4, 371.11, '2025-08-27 16:03:34', 'weekdays');
INSERT INTO `roompricing` VALUES (15, 45, 'entoto', 2, 135.00, '2025-08-27 17:07:50', 'weekends');
INSERT INTO `roompricing` VALUES (16, 44, 'entoto', 4, 270.00, '2025-08-27 17:30:53', 'weekends');

-- ----------------------------
-- Table structure for rooms
-- ----------------------------
DROP TABLE IF EXISTS `rooms`;
CREATE TABLE `rooms`  (
  `room_id` int NOT NULL AUTO_INCREMENT,
  `hotel` enum('africanVillage','bishoftu','entoto','laketana','awashfall') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `room_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('available','occupied','maintenance','hold','booked') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'available',
  `created_at` timestamp NULL DEFAULT current_timestamp,
  `updated_at` timestamp NULL DEFAULT current_timestamp ON UPDATE CURRENT_TIMESTAMP,
  `room_group_room_type_id` int NULL DEFAULT NULL,
  PRIMARY KEY (`room_id`) USING BTREE,
  UNIQUE INDEX `hotel`(`hotel` ASC, `room_number` ASC) USING BTREE,
  INDEX `rooms_ibfk_1`(`room_group_room_type_id` ASC) USING BTREE,
  CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`room_group_room_type_id`) REFERENCES `roomgrouproomtype` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 23 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of rooms
-- ----------------------------
INSERT INTO `rooms` VALUES (15, 'africanVillage', '101', 'available', '2025-08-27 12:16:24', '2025-08-27 15:26:08', 29);
INSERT INTO `rooms` VALUES (16, 'africanVillage', '202', 'available', '2025-08-27 15:25:48', '2025-08-27 15:25:48', 30);
INSERT INTO `rooms` VALUES (17, 'bishoftu', '501', 'available', '2025-08-27 15:51:36', '2025-08-27 16:05:07', 42);
INSERT INTO `rooms` VALUES (18, 'bishoftu', '505', 'available', '2025-08-27 15:59:19', '2025-08-27 16:07:27', 41);
INSERT INTO `rooms` VALUES (19, 'bishoftu', 'P1', 'available', '2025-08-27 16:04:21', '2025-08-27 16:04:21', 31);
INSERT INTO `rooms` VALUES (20, 'bishoftu', '504', 'available', '2025-08-27 16:05:29', '2025-08-27 16:05:29', 42);
INSERT INTO `rooms` VALUES (21, 'bishoftu', 'P2', 'available', '2025-08-27 16:07:52', '2025-08-27 16:07:52', 31);
INSERT INTO `rooms` VALUES (22, 'entoto', 'P1', 'available', '2025-08-27 17:31:18', '2025-08-27 17:31:18', 44);

-- ----------------------------
-- Table structure for roomtypeimages
-- ----------------------------
DROP TABLE IF EXISTS `roomtypeimages`;
CREATE TABLE `roomtypeimages`  (
  `image_id` int NOT NULL AUTO_INCREMENT,
  `room_group_room_type_id` int NOT NULL,
  `image_url` varchar(2083) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `alt_text` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `is_primary` tinyint(1) NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp,
  PRIMARY KEY (`image_id`) USING BTREE,
  INDEX `idx_room_group_room_type_image`(`room_group_room_type_id` ASC) USING BTREE,
  CONSTRAINT `roomtypeimages_ibfk_1` FOREIGN KEY (`room_group_room_type_id`) REFERENCES `roomgrouproomtype` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 20 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of roomtypeimages
-- ----------------------------
INSERT INTO `roomtypeimages` VALUES (12, 29, 'https://res.cloudinary.com/duz3cwxxz/image/upload/v1756326223/kuriftu/room-images/jmcmxdzkq0b7tj5g8xrp.jpg', '', 1, '2025-08-27 12:18:48');
INSERT INTO `roomtypeimages` VALUES (13, 30, 'https://res.cloudinary.com/duz3cwxxz/image/upload/v1756326265/kuriftu/room-images/bs6bfa8wa4qxboqsqzpm.jpg', NULL, 0, '2025-08-27 15:24:27');
INSERT INTO `roomtypeimages` VALUES (14, 42, 'https://res.cloudinary.com/duz3cwxxz/image/upload/v1756327990/kuriftu/room-images/g7h51js0ednl8swubfog.jpg', NULL, 1, '2025-08-27 15:53:11');
INSERT INTO `roomtypeimages` VALUES (15, 41, 'https://res.cloudinary.com/duz3cwxxz/image/upload/v1756328284/kuriftu/room-images/nhymtiiyafqpjdjxxykk.jpg', NULL, 1, '2025-08-27 15:58:05');
INSERT INTO `roomtypeimages` VALUES (16, 31, 'https://res.cloudinary.com/duz3cwxxz/image/upload/v1756328566/kuriftu/room-images/gyxiehvpn0ncehdcr199.jpg', NULL, 0, '2025-08-27 16:02:48');
INSERT INTO `roomtypeimages` VALUES (17, 44, 'https://res.cloudinary.com/duz3cwxxz/image/upload/v1756333912/kuriftu/room-images/gelqg9vg2tqgtj4qapil.jpg', NULL, 0, '2025-08-27 17:31:54');
INSERT INTO `roomtypeimages` VALUES (18, 45, 'https://res.cloudinary.com/duz3cwxxz/image/upload/v1756333954/kuriftu/room-images/ahnfbf8xl9sjtxoh9r5e.jpg', '', 0, '2025-08-27 17:32:37');
INSERT INTO `roomtypeimages` VALUES (19, 45, 'https://res.cloudinary.com/duz3cwxxz/image/upload/v1756334028/kuriftu/room-images/qf3wjdqwo9rqjaxczhhx.jpg', NULL, 0, '2025-08-27 17:33:50');

-- ----------------------------
-- Table structure for roomtypes
-- ----------------------------
DROP TABLE IF EXISTS `roomtypes`;
CREATE TABLE `roomtypes`  (
  `room_type_id` int NOT NULL AUTO_INCREMENT,
  `type_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `max_occupancy` int NULL DEFAULT 2,
  `created_at` timestamp NULL DEFAULT current_timestamp,
  `updated_at` timestamp NULL DEFAULT current_timestamp ON UPDATE CURRENT_TIMESTAMP,
  `hotel` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`room_type_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 22 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of roomtypes
-- ----------------------------
INSERT INTO `roomtypes` VALUES (14, 'King Size', '', 2, '2025-08-27 12:16:07', '2025-08-27 15:21:43', 'africanVillage');
INSERT INTO `roomtypes` VALUES (15, 'Family Room', '', 4, '2025-08-27 15:22:02', '2025-08-27 15:22:02', 'africanVillage');
INSERT INTO `roomtypes` VALUES (16, 'Family', '', 2, '2025-08-27 15:29:36', '2025-08-27 15:29:36', 'bishoftu');
INSERT INTO `roomtypes` VALUES (17, 'King Size', '', 2, '2025-08-27 15:29:49', '2025-08-27 15:29:49', 'bishoftu');
INSERT INTO `roomtypes` VALUES (18, 'Twin', '', 2, '2025-08-27 15:29:56', '2025-08-27 15:29:56', 'bishoftu');
INSERT INTO `roomtypes` VALUES (19, 'Family', '', 4, '2025-08-27 16:51:42', '2025-08-27 16:51:42', 'entoto');
INSERT INTO `roomtypes` VALUES (20, 'King Size', '', 2, '2025-08-27 16:52:07', '2025-08-27 16:53:36', 'entoto');
INSERT INTO `roomtypes` VALUES (21, 'Twin', '', 2, '2025-08-27 16:53:44', '2025-08-27 16:53:44', 'entoto');

-- ----------------------------
-- Table structure for services
-- ----------------------------
DROP TABLE IF EXISTS `services`;
CREATE TABLE `services`  (
  `service_slug` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `service_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`service_slug`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of services
-- ----------------------------

-- ----------------------------
-- Table structure for user_roles
-- ----------------------------
DROP TABLE IF EXISTS `user_roles`;
CREATE TABLE `user_roles`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp,
  `updated_at` timestamp NULL DEFAULT current_timestamp ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `role_name`(`role_name` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of user_roles
-- ----------------------------
INSERT INTO `user_roles` VALUES (1, 'Admin', 'Full system access with all permissions', '2025-08-22 02:08:21', '2025-08-22 02:08:21');
INSERT INTO `user_roles` VALUES (2, 'Sales Manager', 'Sales and marketing related access', '2025-08-22 02:08:21', '2025-08-22 02:08:21');
INSERT INTO `user_roles` VALUES (3, 'Front Office Manager', 'Front office operations access', '2025-08-22 02:08:21', '2025-08-22 02:08:21');
INSERT INTO `user_roles` VALUES (4, 'Reservation Officer', 'Reservation and booking access', '2025-08-22 02:08:21', '2025-08-22 02:08:21');

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `role` enum('Admin','Reservation Officer','Sales Manager','Front Office Manager') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'Front Office Manager',
  `is_active` tinyint(1) NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp,
  `updated_at` timestamp NULL DEFAULT current_timestamp ON UPDATE CURRENT_TIMESTAMP,
  `email_verified` tinyint(1) NULL DEFAULT 0,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `email`(`email` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 18 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES (2, 'admin', 'admin@gmail.com', '$2a$10$FTtjNilsiI5d0zv5qgrtgepyvw5YNV2/8KxdQMm.PH9dnWRPTydh.', 'Admin', 1, '2025-08-21 15:15:52', '2025-08-23 10:27:18', 0, NULL);
INSERT INTO `users` VALUES (17, 'Amanueal Daba', 'aman@pier5studios.com', '$2a$10$00VkNStyGpWwk5Y66h5FnuQW4ErcpFOADwZsNond/rCAFE5AjMuam', 'Front Office Manager', 0, '2025-08-28 08:43:22', '2025-08-28 08:43:22', 0, NULL);

-- ----------------------------
-- Procedure structure for add_menu_item
-- ----------------------------
DROP PROCEDURE IF EXISTS `add_menu_item`;
delimiter ;;
CREATE PROCEDURE `add_menu_item`(IN menu_id VARCHAR(50),
    IN label VARCHAR(100),
    IN icon VARCHAR(50),
    IN href VARCHAR(200),
    IN parent_id VARCHAR(50),
    IN sort_order INT)
BEGIN
    -- Insert menu item
    INSERT INTO menu_items (menu_id, label, icon, href, parent_id, sort_order)
    VALUES (menu_id, label, icon, href, parent_id, sort_order);
    
    -- Set default permissions (only Admin can view by default)
    INSERT INTO menu_permissions (role_id, menu_id, can_view)
    SELECT r.id, menu_id, TRUE
    FROM user_roles r
    WHERE r.role_name = 'Admin';
END
;;
delimiter ;

-- ----------------------------
-- Procedure structure for get_menu_items_by_role
-- ----------------------------
DROP PROCEDURE IF EXISTS `get_menu_items_by_role`;
delimiter ;;
CREATE PROCEDURE `get_menu_items_by_role`(IN role_name VARCHAR(50))
BEGIN
    SELECT 
        m.menu_id,
        m.label,
        m.icon,
        m.href,
        m.parent_id,
        m.sort_order,
        mp.can_view
    FROM menu_items m
    JOIN menu_permissions mp ON m.menu_id = mp.menu_id
    JOIN user_roles r ON mp.role_id = r.id
    WHERE r.role_name = role_name 
    AND mp.can_view = TRUE
    AND m.is_active = TRUE
    ORDER BY m.sort_order, m.label;
END
;;
delimiter ;

-- ----------------------------
-- Procedure structure for update_menu_permission
-- ----------------------------
DROP PROCEDURE IF EXISTS `update_menu_permission`;
delimiter ;;
CREATE PROCEDURE `update_menu_permission`(IN role_name VARCHAR(50),
    IN menu_id VARCHAR(50),
    IN can_view BOOLEAN)
BEGIN
    UPDATE menu_permissions mp
    JOIN user_roles r ON mp.role_id = r.id
    SET mp.can_view = can_view,
        mp.updated_at = CURRENT_TIMESTAMP
    WHERE r.role_name = role_name 
    AND mp.menu_id = menu_id;
END
;;
delimiter ;

SET FOREIGN_KEY_CHECKS = 1;
