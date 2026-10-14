const express = require('express');
const router = express.Router();
const User = require("../models/user");           // for role check
const { jwtAuthMiddleware } = require("../jwt");
const Candidate = require("../models/candidate");

// Helper: check if user is admin
const checkAdminRole = async (userId) => {
    try {
        const user = await User.findById(userId);
        return user.role === 'admin';
    } catch (err) {
        return false;
    }
}

// POST / — add a new candidate (admin only)
router.post('/', async (req, res) => {
    try {
        if (!(await checkAdminRole(req.user.id)))
            return res.status(403).json({ message: 'You are not admin' });

        const data = req.body;
        const newCandidate = new Candidate(data);
        const response = await newCandidate.save();
        console.log('candidate saved successfully');
        res.status(200).json({ response: response });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "internal server error" });
    }
})

// GET / — list all candidates
router.get('/', async (req, res) => {
    try {
        const candidates = await Candidate.find();
        return res.status(200).json(candidates);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "internal server error" });
    }
})

// PUT /:candidateId — update a candidate (admin only)
router.put("/:candidateId", jwtAuthMiddleware, async (req, res) => {
    try {
        if (!(await checkAdminRole(req.user.id)))
            return res.status(403).json({ message: 'You are not admin' });

        const candidateId = req.params.candidateId;
        const updatedData = req.body;
        const response = await Candidate.findByIdAndUpdate(candidateId, updatedData, {
            new: true,
            runValidators: true,
        });
        if (!response) {
            return res.status(404).json({ error: "no such candidate found" });
        }
        console.log("candidate updated");
        res.status(200).json(response);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "internal server error" });
    }
})

// DELETE /:candidateId — delete a candidate (admin only)
router.delete("/:candidateId", jwtAuthMiddleware, async (req, res) => {
    try {
        if (!(await checkAdminRole(req.user.id)))
            return res.status(403).json({ message: 'You are not admin' });

        const candidateId = req.params.candidateId;
        const response = await Candidate.findByIdAndDelete(candidateId);
        if (!response) {
            return res.status(404).json({ error: "no such candidate found" });
        }
        console.log("candidate deleted");
        res.status(200).json({ message: "Candidate deleted successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "internal server error" });
    }
})

router.post('/vote/:candidateId', jwtAuthMiddleware, async (req, res) => {
    candidateId = req.params.candidateId;
    userId = req.user.id
    try {
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
            return res.status(404).json({ error: "no such candidate found" });
        }
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ error: "no such user found" });
        }
        if (user.isVoted) {
            return res.status(400).json({ message: "You have already voted" })
        }
        if (user.role === "admin") {
            return res.status(403).json({ message: "admin is not allowed to vote" })
        }
        candidate.votes.push({ user: user.id });
        candidate.voteCount++
        await candidate.save();

        user.isVoted = true;
        await user.save();

        res.status(200).json({ message: 'Vote recorded successfully' })
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ error: "internal server error" })
    }
})

router.get('/vote/count', async (res, req) => {
    try{
        const candidate = await Candidate.find().sort({voteCount: "desc"})

        const voteRecord = candidate.map((data) => {
            return{
                party : data.party,
                count : data.voteCount
            }
        })
        res.status(200).json({voteRecord})
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ error: "internal server error" })
    }
})


module.exports = router;
