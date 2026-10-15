// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OrderFlowRegistry
 * @dev On-Chain Journal & Behavioral Proof Registry for OrderFlow on BOT Chain (Bohr Testnet / Mainnet).
 * Enables traders and autonomous AI agents to notarize trading journal reports,
 * verify behavioral metrics on-chain with sub-second finality (~0.75s blocks),
 * and claim verifiable on-chain behavioral milestone badges.
 */
contract OrderFlowRegistry {
    // ─── Structs ──────────────────────────────────────────────────────────────

    struct JournalReport {
        bytes32 reportId;
        uint256 tradeCount;
        uint256 winRate;      // Scaled by 100 (e.g. 5850 = 58.50%)
        uint256 sizeRatio;    // Loss/Win size ratio scaled by 100 (e.g. 270 = 2.7x)
        string dominantDna;   // e.g. "Momentum-Driven Reactive Trader"
        uint256 timestamp;
    }

    struct Badge {
        uint256 badgeType;
        string title;
        uint256 awardedAt;
    }

    // ─── State Variables ──────────────────────────────────────────────────────

    address public owner;
    uint256 public totalReportsNotarized;
    uint256 public totalBadgesAwarded;

    // Trader => Array of notarized reports
    mapping(address => JournalReport[]) private _traderReports;

    // Report hash => Exists
    mapping(bytes32 => bool) public isReportRegistered;

    // Trader => (BadgeType => HasBadge)
    mapping(address => mapping(uint256 => bool)) public hasBadge;

    // Trader => Array of claimed badges
    mapping(address => Badge[]) private _traderBadges;

    // ─── Events ───────────────────────────────────────────────────────────────

    event ReportNotarized(
        address indexed trader,
        bytes32 indexed reportId,
        uint256 tradeCount,
        uint256 winRate,
        string dominantDna,
        uint256 timestamp
    );

    event BadgeAwarded(
        address indexed trader,
        uint256 indexed badgeType,
        string title,
        uint256 timestamp
    );

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "OrderFlowRegistry: Caller is not the owner");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─── Core Functions ───────────────────────────────────────────────────────

    /**
     * @notice Notarize an AI trading analysis report on BOT Chain.
     * @param reportId Unique hash of the report (e.g. keccak256 of report content or UUID).
     * @param tradeCount Total trades analyzed in the report.
     * @param winRate Overall win rate scaled by 100 (e.g. 6200 for 62.00%).
     * @param sizeRatio Average loss/win size ratio scaled by 100 (e.g. 150 for 1.5x).
     * @param dominantDna Classification summary string from Gemini AI.
     */
    function notarizeReport(
        bytes32 reportId,
        uint256 tradeCount,
        uint256 winRate,
        uint256 sizeRatio,
        string calldata dominantDna
    ) external {
        require(reportId != bytes32(0), "OrderFlowRegistry: Invalid report ID");
        require(!isReportRegistered[reportId], "OrderFlowRegistry: Report already notarized");

        JournalReport memory report = JournalReport({
            reportId: reportId,
            tradeCount: tradeCount,
            winRate: winRate,
            sizeRatio: sizeRatio,
            dominantDna: dominantDna,
            timestamp: block.timestamp
        });

        _traderReports[msg.sender].push(report);
        isReportRegistered[reportId] = true;
        totalReportsNotarized++;

        emit ReportNotarized(
            msg.sender,
            reportId,
            tradeCount,
            winRate,
            dominantDna,
            block.timestamp
        );

        // Auto-evaluate milestone badges
        _evaluateMilestoneBadges(msg.sender, tradeCount, winRate, sizeRatio);
    }

    /**
     * @dev Automatically check and award milestone badges based on verified metrics.
     */
    function _evaluateMilestoneBadges(
        address trader,
        uint256 tradeCount,
        uint256 winRate,
        uint256 sizeRatio
    ) internal {
        // Badge 1: Veteran Trader (100+ trades analyzed)
        if (tradeCount >= 100 && !hasBadge[trader][1]) {
            _grantBadge(trader, 1, "Veteran On-Chain Trader");
        }

        // Badge 2: Disciplined Risk (Loss/Win size ratio <= 1.5x)
        if (sizeRatio > 0 && sizeRatio <= 150 && !hasBadge[trader][2]) {
            _grantBadge(trader, 2, "Disciplined Sizing Alpha");
        }

        // Badge 3: Consistent Edge (Win rate >= 60%)
        if (winRate >= 6000 && !hasBadge[trader][3]) {
            _grantBadge(trader, 3, "High Win-Rate Master");
        }
    }

    function _grantBadge(address trader, uint256 badgeType, string memory title) internal {
        hasBadge[trader][badgeType] = true;
        _traderBadges[trader].push(Badge({
            badgeType: badgeType,
            title: title,
            awardedAt: block.timestamp
        }));
        totalBadgesAwarded++;

        emit BadgeAwarded(trader, badgeType, title, block.timestamp);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /**
     * @notice Get all reports notarized by a specific trader.
     */
    function getTraderReports(address trader) external view returns (JournalReport[] memory) {
        return _traderReports[trader];
    }

    /**
     * @notice Get total count of reports notarized by a trader.
     */
    function getTraderReportCount(address trader) external view returns (uint256) {
        return _traderReports[trader].length;
    }

    /**
     * @notice Get all badges earned by a trader.
     */
    function getTraderBadges(address trader) external view returns (Badge[] memory) {
        return _traderBadges[trader];
    }
}
