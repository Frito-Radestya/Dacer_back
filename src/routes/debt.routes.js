const express = require('express')
const router = express.Router()
const debtController = require('../controllers/debt.controller')

router.get('/', debtController.getDebts)
router.post('/', debtController.createDebt)
router.put('/:id', debtController.updateDebt)
router.delete('/:id', debtController.deleteDebt)

module.exports = router
