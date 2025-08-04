-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               10.4.32-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.6.0.6765
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for qbox_6510e0
CREATE DATABASE IF NOT EXISTS `qbox_6510e0` /*!40100 DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci */;
USE `qbox_6510e0`;

-- Dumping structure for table qbox_6510e0.lspd_clock
CREATE TABLE IF NOT EXISTS `lspd_clock` (
  `citizenid` varchar(64) NOT NULL,
  `discord_id` varchar(64) DEFAULT NULL,
  `total_duration` int(11) DEFAULT 0,
  `last_clock_in` datetime DEFAULT NULL,
  `last_clock_out` datetime DEFAULT NULL,
  `job_rank` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Dumping data for table qbox_6510e0.lspd_clock: ~3 rows (approximately)
INSERT INTO `lspd_clock` (`citizenid`, `discord_id`, `total_duration`, `last_clock_in`, `last_clock_out`, `job_rank`) VALUES
	('A', '302050872383242240', 50000, NULL, NULL, 'Captain'),
	('H15Z192A', '867352735409504306', 22, '2025-08-04 07:47:53', '2025-08-04 07:47:58', 'Lieutenant'),
	('H15Z192AA', '981938200647983144', 20000, NULL, NULL, 'Chief');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
