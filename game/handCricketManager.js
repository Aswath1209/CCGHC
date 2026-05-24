const lobbies = new Map();
const userLobbyMap = new Map(); // userId -> messageId

class HandCricketManager {
    createLobby(chatId, host) {
        const lobby = {
            chatId,
            host,
            players: [host],
            state: 'LOBBY', // LOBBY, TOSS_CHOOSE_SIDE, TOSS_CHOOSE_ROLE, PLAYING, SUPER_BALL, FINISHED
            innings: 1,
            batsmanId: null,
            bowlerId: null,
            currentScore: 0,
            target: null,
            submissions: {}, // userId -> number
            lastMove: null, // { batNum, bowlNum }
            balls: 0,
            winnerId: null,
            createdAt: Date.now(),
            messageId: null,
            tossWinnerId: null,
            tossLoserId: null,
            tossChoiceResult: null,
            superBallSubState: null, // BAT_1, BAT_2
            superBallScore1: null,
            superBallScore2: null
        };
        return lobby;
    }

    saveLobby(messageId, lobby) {
        lobby.messageId = messageId;
        lobbies.set(messageId, lobby);
        if (lobby.players) {
            lobby.players.forEach(p => userLobbyMap.set(p.id, messageId));
        }
    }

    getLobby(messageId) {
        return lobbies.get(messageId);
    }

    getLobbyByUserId(userId) {
        const messageId = userLobbyMap.get(userId);
        if (!messageId) return null;
        const lobby = lobbies.get(messageId);
        if (!lobby) {
            userLobbyMap.delete(userId);
            return null;
        }
        return lobby;
    }

    joinLobby(messageId, user) {
        const lobby = lobbies.get(messageId);
        if (!lobby || lobby.players.length >= 2 || lobby.state !== 'LOBBY') return false;
        if (lobby.players.find(p => p.id === user.id)) return false;
        lobby.players.push(user);
        lobby.state = 'TOSS_CHOOSE_SIDE';
        userLobbyMap.set(user.id, messageId);
        return true;
    }

    deleteLobby(messageId) {
        const lobby = lobbies.get(messageId);
        if (lobby) {
            lobby.players.forEach(p => userLobbyMap.delete(p.id));
        }
        lobbies.delete(messageId);
    }

    performTossChoice(messageId, choice) {
        const lobby = lobbies.get(messageId);
        if (!lobby || lobby.state !== 'TOSS_CHOOSE_SIDE') return null;

        const tossResult = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = choice === tossResult;

        const host = lobby.host;
        const opponent = lobby.players.find(p => p.id !== host.id);

        lobby.tossWinnerId = won ? host.id : opponent.id;
        const winner = lobby.players.find(p => p.id === lobby.tossWinnerId);
        const loser = lobby.players.find(p => p.id !== lobby.tossWinnerId);

        lobby.tossLoserId = loser.id;
        lobby.tossChoiceResult = tossResult;
        lobby.state = 'TOSS_CHOOSE_ROLE';

        return { winner, tossResult };
    }

    selectRole(messageId, choice) {
        const lobby = lobbies.get(messageId);
        if (!lobby || lobby.state !== 'TOSS_CHOOSE_ROLE') return null;

        const winner = lobby.players.find(p => p.id === lobby.tossWinnerId);
        const loser = lobby.players.find(p => p.id !== lobby.tossWinnerId);

        if (choice === 'bat') {
            lobby.batsmanId = winner.id;
            lobby.bowlerId = loser.id;
        } else {
            lobby.batsmanId = loser.id;
            lobby.bowlerId = winner.id;
        }

        lobby.state = 'PLAYING';
        lobby.balls = 0;
        lobby.lastBallResult = `🪙 <b>Toss:</b> <a href="tg://user?id=${winner.id}">${winner.first_name}</a> won the toss and elected to <b>${choice === 'bat' ? 'BAT' : 'BOWL'}</b> first!\n`;

        return lobby;
    }

    submitMove(messageId, userId, num) {
        const lobby = lobbies.get(messageId);
        if (!lobby || (lobby.state !== 'PLAYING' && lobby.state !== 'SUPER_BALL')) return { error: "No active game." };
        if (userId !== lobby.batsmanId && userId !== lobby.bowlerId) return { error: "You are not in this game." };
        
        const isBatsman = userId === lobby.batsmanId;
        const isBowler = userId === lobby.bowlerId;

        if (isBatsman) {
            if (lobby.submissions[lobby.batsmanId] !== undefined) return { error: "You already chose! Wait for the bowler." };
            lobby.submissions[lobby.batsmanId] = num;
            return { success: true, waitingForBowler: true };
        }

        if (isBowler) {
            if (lobby.submissions[lobby.batsmanId] === undefined) return { error: "Wait for the batsman to choose first!" };
            if (lobby.submissions[lobby.bowlerId] !== undefined) return { error: "You already chose!" };
            lobby.submissions[lobby.bowlerId] = num;
        }

        // Both chose
        const batNum = lobby.submissions[lobby.batsmanId];
        const bowlNum = lobby.submissions[lobby.bowlerId];
        
        lobby.submissions = {};

        const batPlayerObj = lobby.players.find(p => p.id === lobby.batsmanId);
        const bowlPlayerObj = lobby.players.find(p => p.id === lobby.bowlerId);
        const playerNames = {
            batName: batPlayerObj.first_name,
            bowlName: bowlPlayerObj.first_name
        };

        // Super Ball Move Handling
        if (lobby.state === 'SUPER_BALL') {
            lobby.lastMove = { batNum, bowlNum };
            if (lobby.superBallSubState === 'BAT_1') {
                const score1 = (batNum === bowlNum) ? 0 : batNum;
                lobby.superBallScore1 = score1;
                
                // Swap roles for the second batsman
                const temp = lobby.batsmanId;
                lobby.batsmanId = lobby.bowlerId;
                lobby.bowlerId = temp;
                
                lobby.superBallSubState = 'BAT_2';
                
                return {
                    type: 'SUPER_BALL_1_DONE',
                    batNum,
                    bowlNum,
                    score1,
                    ...playerNames
                };
            } else {
                // BAT_2
                const score2 = (batNum === bowlNum) ? 0 : batNum;
                lobby.superBallScore2 = score2;

                const score1 = lobby.superBallScore1;
                const bat2Player = lobby.players.find(p => p.id === lobby.batsmanId);
                const bowl2Player = lobby.players.find(p => p.id === lobby.bowlerId);

                if (score2 > score1) {
                    lobby.state = 'FINISHED';
                    lobby.winnerId = bat2Player.id;
                    return {
                        type: 'SUPER_BALL_OVER',
                        batNum,
                        bowlNum,
                        score1,
                        score2,
                        winnerId: lobby.winnerId,
                        ...playerNames
                    };
                } else if (score1 > score2) {
                    lobby.state = 'FINISHED';
                    lobby.winnerId = bowl2Player.id;
                    return {
                        type: 'SUPER_BALL_OVER',
                        batNum,
                        bowlNum,
                        score1,
                        score2,
                        winnerId: lobby.winnerId,
                        ...playerNames
                    };
                } else {
                    // Tie again! Reset to BAT_1.
                    // Do not swap roles: the player who just batted (last) bats first in the new Super Ball.
                    lobby.superBallSubState = 'BAT_1';
                    lobby.superBallScore1 = null;
                    lobby.superBallScore2 = null;

                    return {
                        type: 'SUPER_BALL_TIE_RESTART',
                        batNum,
                        bowlNum,
                        score1,
                        score2,
                        ...playerNames
                    };
                }
            }
        }

        // Standard Play Move Handling
        lobby.balls++;
        lobby.lastMove = { batNum, bowlNum };

        if (batNum === bowlNum) {
            // OUT
            if (lobby.innings === 1) {
                lobby.target = lobby.currentScore + 1;
                lobby.innings = 2;
                lobby.currentScore = 0;
                lobby.balls = 0;
                // Swap roles
                const temp = lobby.batsmanId;
                lobby.batsmanId = lobby.bowlerId;
                lobby.bowlerId = temp;
                return { type: 'OUT_INNINGS_BREAK', batNum, bowlNum, ...playerNames };
            } else {
                if (lobby.currentScore === lobby.target - 1) {
                    // TIE -> Trigger Super Ball!
                    // Do not swap roles: the player who was just batting (last) will bat first.
                    lobby.state = 'SUPER_BALL';
                    lobby.superBallSubState = 'BAT_1';
                    lobby.superBallScore1 = null;
                    lobby.superBallScore2 = null;
                    return { type: 'OUT_TIE_SUPER_BALL', batNum, bowlNum, ...playerNames };
                } else {
                    lobby.state = 'FINISHED';
                    lobby.winnerId = lobby.bowlerId; 
                    return { type: 'OUT_GAME_OVER', batNum, bowlNum, winnerId: lobby.winnerId, ...playerNames };
                }
            }
        } else {
            // Safe
            lobby.currentScore += batNum;
            
            if (lobby.innings === 2 && lobby.currentScore >= lobby.target) {
                lobby.state = 'FINISHED';
                lobby.winnerId = lobby.batsmanId;
                return { type: 'CHASE_SUCCESS', batNum, bowlNum, winnerId: lobby.winnerId, ...playerNames };
            }
            
            return { type: 'SAFE', batNum, bowlNum, ...playerNames };
        }
    }

    getLobbies() {
        return lobbies;
    }
}

module.exports = new HandCricketManager();
